#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import calendar
import logging
import re
import sched
import time
from datetime import datetime
from queue import Queue
from threading import Event, Thread
from typing import Dict, List, Tuple, Optional

import numpy as np
from api import base
from api.models import TestRunExecution, TestSchedule, TestStatus
from api.network_test.run_test_plan import run_test_plan
from api.network_test.mysql_helper import MySqlHelper
from logger import Logger


_log = Logger(__name__, logging.DEBUG).get_logger()


class Scheduler(Thread):
    """
        This is a scheduler for the network test.  It uses python 'sched'
        It assumes there is a list of scheduled items using cron format
        - minute, hour, day of month, month, day of week
        supporting a comma-separated or hyphen-separated list - no other
        advanced features (e.g. */5 is not supported)

        A cron entry is either a * or a list for each field (minute, hour ...)
        examples:
        0 4,5 * * * - run every day at 4am and at 5am
        30 * * * * - run every hour on the half hour
        20 14 * * mon-fri  - run every weekday at 2:20pm
        * * * * * - run every minute (practically continuously because tests
           take longer than 1 minute) - not recommended on a production network

        An "ASAP" field is included to indicate that the test should be run
        as soon as possible instead of on a schedule.  If there is another test
        running, the ASAP test will wait until it's done, otherwise it will
        run the test immediately.

        sched supports priorities.  If 2+ tests are scheduled to run, the one
        with the higher priority goes first.  ASAP tests are always highest
        priority.

        There is one scheduler thread per network - each thread is
        identified by the thread_id and thread_name (normally the topology id
        and topology name); within a network, there is only one thread

        The operation works as follows:
        1. read the list of scheduled tests and schedule
           them using python sched; remove any test currently scheduled if it
           is not on the list
        2. if the scheduler receives an "event" using threading Event, then
           it repeats step 1.
        3. when it's time, sched will run a test in the same thread and block;
           At the completion of a test,
           it will delete the test from the list if was an ASAP test and,
           ASAP or not, it then repeats step 1
    """

    np.seterr(all="raise")

    def __init__(
        self,
        sched_event: Event,
        thread_id: int,
        thread_name: str,
        mysql_helper: MySqlHelper,
    ) -> None:
        Thread.__init__(self)
        self.sched_event = sched_event
        self.thread_id = thread_id
        # for information only
        self.thread_name = thread_name
        self.sched_obj = sched.scheduler(time.time, time.sleep)
        self.mysql_helper = mysql_helper

    def run(self) -> None:
        _log.info("Starting scheduler thread {}".format(self.thread_name))

        # remove stale tests if they are more than 1 minute old; if it is
        # less than 1 minute old, assume that the intention is to run it now
        tsps = self.mysql_helper.read_test_schedule(asap=1)
        for id in tsps:
            _log.debug("Checking for stale ASAP tests id = {}".format(id))
            self._delete_stale_tests(test_schedule_id=id, stale_time=60)

        # initialize scheduled tests
        self._schedule_tests()
        self._print_queue()

        # this is the main scheduler loop
        # if there is a test to schedule, it runs the test, otherwise
        # keeps looping
        # queue is used to signal scheduler that schedule has changed or that
        # a test has completed
        while True:
            self.sched_obj.run(blocking=False)

            # the event is used to signal scheduler that there is a new
            # schedule or that a test has completed running
            event = self.sched_event.wait(timeout=5)
            if event:
                self.sched_event.clear()
                _log.info("Scheduler received event for {}".format(self.thread_name))
                self._schedule_tests()
                self._print_queue()

    # if the status is scheduled, then delete rows from test schedule
    # and test run execution
    # otherwise, delete only test schedule row
    def _delete_stale_tests(self, test_schedule_id: int, stale_time: int) -> None:
        # read test_run_execution JOIN test schedule tables
        try:
            ts_dct = self.mysql_helper.join_test_schedule_test_run_execution(
                id=test_schedule_id
            )[test_schedule_id]
            ts_id = ts_dct["id"]
            tre_id = ts_dct["test_run_execution"]["id"]
            _log.debug(
                "Reading TestSchedule and TestRunExecution JOIN; ts_id {}, tre_id {}".format(
                    ts_id, tre_id
                )
            )

            tm = datetime.now()
            unix_time_now = time.mktime(tm.timetuple())
            dbtime = ts_dct["created_at"]
            unix_time_db = time.mktime(dbtime.timetuple())
            if unix_time_now - unix_time_db > stale_time:
                if ts_dct["test_run_execution"]["status"] == TestStatus.SCHEDULED.value:
                    _log.info(
                        "Deleting stale test run execution id {}, test schedule id {}".format(
                            tre_id, ts_id
                        )
                    )
                    # deletes TestRunExecution row and all foreign associated rows
                    self.mysql_helper.delete_test_run_execution(id=tre_id)
                else:
                    _log.info(
                        "Deleting schedule id {} (test is running or ran)".format(ts_id)
                    )
                    # only delete row of TestSchedule
                    self.mysql_helper.delete_test_schedule(id=ts_id)
        except Exception as e:
            _log.error("Error accessing the joined tables {}".format(e))

    # function just for printing
    def _print_queue(self) -> None:
        for event in self.sched_obj.queue:
            _log.info(
                "Event scheduled at {} priority {} test schedule id {}".format(
                    time.strftime("%d %b %Y %H:%M:%S (UTC)", time.gmtime(event.time)),
                    event.priority,
                    event.kwargs["test_schedule_id"],
                )
            )

    # checks the sched queue
    def _is_test_schedule_id_in_queue(self, id) -> bool:
        for event in self.sched_obj.queue:
            if event.kwargs["test_schedule_id"] == id:
                return True
        return False

    # 1. read the test schedule from the db
    # 2. schedule a test if it's new
    # 3. remove scheduled tests if they are no longer in the db
    def _schedule_tests(self) -> None:
        # read all tests from the db
        tsps = self.mysql_helper.read_test_schedule()

        tm = datetime.now()

        for test_schedule_id, tsp in tsps.items():
            # only add new rows into the schedule
            if not self._is_test_schedule_id_in_queue(test_schedule_id):
                if tsp["asap"]:
                    # sched will run any job scheduled in the past immediately
                    unix_time = time.time()
                    # ASAP always has highest priority
                    priority = 1
                else:
                    unix_time = self._get_next_scheduled_time(tm, tsp)
                    priority = tsp["priority"] + 1

                _log.info(
                    "Adding job {} to job queue to start at {}".format(
                        test_schedule_id,
                        time.strftime(
                            "%d %b %Y %H:%M:%S (UTC)", time.gmtime(unix_time)
                        ),
                    )
                )
                self.sched_obj.enterabs(
                    unix_time,
                    priority,
                    self._run_test,
                    kwargs={
                        "test_run_execution_id": tsp["test_run_execution"],
                        "test_schedule_id": test_schedule_id,
                    },
                )

        # remove queued jobs that aren't in the db
        for event in self.sched_obj.queue:
            test_schedule_id = event.kwargs["test_schedule_id"]
            if test_schedule_id not in tsps:
                _log.info("Removed job {} from job queue".format(test_schedule_id))
                self.sched_obj.cancel(event)

    # _run_test() is the function that runs when a test is scheduled
    # it blocks until the test is completed (runs test in same thread)
    # it deletes the schedule if it's ASAP
    # it schedules new tests after the test is complete
    def _run_test(self, test_run_execution_id, test_schedule_id) -> None:
        _log.info(
            "Running test with "
            "test_run_execution_id = {} and test_schedule_id {} now ({})".format(
                test_run_execution_id,
                test_schedule_id,
                time.strftime("%d %b %Y %H:%M:%S (UTC)", time.gmtime(time.time())),
            )
        )

        # delete row from schedule if it is ASAP
        try:
            tsps = self.mysql_helper.read_test_schedule(id=test_schedule_id)
            if tsps[test_schedule_id]["asap"]:
                _log.info(
                    "Deleting ASAP test schedule with id {}".format(test_schedule_id)
                )
                self.mysql_helper.delete_test_schedule(id=test_schedule_id)
                self.mysql_helper.update_test_run_execution(
                    id=test_run_execution_id, status=TestStatus.QUEUED.value
                )
            else:
                # make a copy of the test_run_execution row; if test is not ASAP
                # then it will be scheduled again
                tre = self.mysql_helper.read_test_run_execution(
                    id=test_run_execution_id
                )[test_run_execution_id]
                tre["status"] = TestStatus.QUEUED.value
                tre.pop("id")  # need to delete id to prevent duplicate id error
                test_run_execution_id = self.mysql_helper.create_test_run_execution(
                    **tre
                )
                _log.info(
                    "Created new test run execution row; id = {}".format(
                        test_run_execution_id
                    )
                )
        except KeyError as e:
            _log.critical("KeyError when reading mysql {}", format(e))
            return

        _log.debug(
            "Running test with test run execution id {}".format(test_run_execution_id)
        )
        run_test_plan(
            test_run_execution_id=test_run_execution_id, mysql_helper=self.mysql_helper
        )

        _log.info("Test run execution id {} complete".format(test_run_execution_id))
        self._schedule_tests()
        self._print_queue()

    # arr is a list of integers representing the field (e.g. minutes)
    # val is the current value of that field
    # period is 60 for minutes, 24 for hours, etc.
    # returns the next value for that field and an indication of having wrapped
    # e.g. if arr = [5, 20] val = 22, and period = 24, the next value would be
    #   5 and it did wrap around to get there
    def _find_next_time(self, arr, val, period) -> Tuple[int, bool]:
        if arr[0] is "*":
            return val, 0
        try:
            nparr = np.array([int(numeric) for numeric in arr])
        except ValueError:
            _log.error("Invalid cron entry")
            return np.nan
        df = nparr - val
        neg_idx = np.flatnonzero(df < 0)
        df[neg_idx] = df[neg_idx] + period
        i = np.argmin(df)
        return nparr[i], i in neg_idx

    # cron_field is a string cron entry (e.g. "*" or "3" or "3,4-6")
    # dow is true if this is a day of the week (e.g. monday)
    # function returns a list of integers representing the days, hours, ...
    # for days of week, 0 = monday, 6 = sunday
    # this does not support words for months (e.g. "august")
    def _decode_cron_entry(self, cron_field: str, dow: bool = False) -> list:
        if cron_field is "*":
            return ["*"]

        int_list = []
        try:
            cron_split = cron_field.split(",")
            int_list = []
            for i in range(len(cron_split)):
                if cron_split[i].isdigit():
                    int_list.append(int(cron_split[i]))
                elif dow:
                    # support mon-fri or monday-friday but not mon-friday
                    hyph_split = cron_split[i].split("-")
                    wdayb = -1
                    wdaye = -1
                    try:
                        wdayb = time.strptime(hyph_split[0], "%A").tm_wday
                        if len(hyph_split) > 1:
                            wdaye = time.strptime(hyph_split[1], "%A").tm_wday
                    except ValueError:
                        try:
                            wdayb = time.strptime(hyph_split[0], "%a").tm_wday
                            if len(hyph_split) > 1:
                                wdaye = time.strptime(hyph_split[1], "%a").tm_wday
                        except ValueError:
                            _log.error("not a valid weekday")
                            return []
                    if wdayb >= 0 and wdaye == -1:
                        int_list.append(wdayb)
                    elif wdayb >= 0 and wdaye >= 0:
                        for ii in range(wdayb, wdaye + 1):
                            int_list.append(ii)
                    else:
                        _log.error("not a valid weekday")
                        return []
                else:
                    hyph_split = cron_split[i].split("-")
                    for ii in range(int(hyph_split[0]), int(hyph_split[1]) + 1):
                        int_list.append(ii)
        except IndexError:
            _log.error("invalid cron entry")
            return []
        return int_list

    # returns dict, out, each entry is an integer list representing the field
    # e.g. out["minute"] = [5,20] would be for 5 and 20 minutes after the hour
    def _decode_cron(self, cron: dict) -> dict:
        out = {}
        out["minute"] = self._decode_cron_entry(cron["cron_minute"])
        out["hour"] = self._decode_cron_entry(cron["cron_hour"])
        out["day_of_month"] = self._decode_cron_entry(cron["cron_day_of_month"])
        out["month"] = self._decode_cron_entry(cron["cron_month"])
        out["day_of_week"] = self._decode_cron_entry(cron["cron_day_of_week"], True)

        if (
            not out["minute"]
            or not out["hour"]
            or not out["day_of_month"]
            or not out["month"]
            or not out["day_of_week"]
        ):
            return {}
        return out

    # given the time in datetime.datetime() format
    # and the cron entry, return the next scheduled time as a unix time
    def _get_next_scheduled_time(self, tm: datetime, cron: dict) -> float:
        unix_time = time.mktime(tm.timetuple())
        _log.info(
            "current time: {}".format(
                time.strftime("%d %b %Y %H:%M:%S (UTC)", time.gmtime(unix_time))
            )
        )

        cron_dict = self._decode_cron(cron)
        if not cron_dict:
            return float("nan")

        days_this_month = calendar.monthrange(tm.year, tm.month)[1]

        unix_time = time.mktime(tm.timetuple())
        # add one minute; without this, if test < 1 minute, it will schedule
        # another test in the same minute
        unix_time += 60
        tm = datetime.fromtimestamp(unix_time)
        tm = datetime.fromtimestamp(
            time.mktime(
                time.struct_time(
                    [tm.year, tm.month, tm.day, tm.hour, tm.minute, 0, 0, 0, -1]
                )
            )
        )
        unix_time = time.mktime(tm.timetuple())

        done = False
        iter = 0
        while not done:
            iter += 1
            if iter > 100:
                _log.critical("Algorithm bug")
                return float("nan")

            # minutes
            if cron_dict["minute"][0] != "*":
                next_minute, wrap = self._find_next_time(
                    cron_dict["minute"], tm.minute, 60
                )
                if next_minute != tm.minute:
                    if wrap:
                        unix_time += 60 * 60  # add an hour
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time(
                                [
                                    tm.year,
                                    tm.month,
                                    tm.day,
                                    tm.hour,
                                    next_minute,
                                    0,
                                    0,
                                    0,
                                    -1,
                                ]
                            )
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())

            # hour
            if cron_dict["hour"][0] != "*":
                next_hour, wrap = self._find_next_time(cron_dict["hour"], tm.hour, 24)
                if next_hour != tm.hour:
                    if wrap:
                        unix_time += 60 * 60 * 24  # add a day
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time(
                                [tm.year, tm.month, tm.day, next_hour, 0, 0, 0, 0, -1]
                            )
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())
                    continue

            # from man pages:
            # Note: The day of a command's execution can be specified in the
            # following two fields — 'day of month', and 'day of week'.
            # If both fields are restricted (i.e., do not contain the "*"
            # character), the command will be run when either
            # field matches the current time.  For example,
            #   "30 4 1,15 * 5" would cause a command to be run at 4:30 am on
            # the 1st and 15th of each month, plus every Friday.

            # weekdays/days of the month - in python, monday = 0
            if (
                cron_dict["day_of_week"][0] != "*"
                and cron_dict["day_of_month"][0] != "*"
            ):
                next_weekday, wrap = self._find_next_time(
                    cron_dict["day_of_week"], tm.weekday(), 7
                )
                next_day, wrap = self._find_next_time(
                    cron_dict["day_of_month"], tm.day, days_this_month
                )
                if next_weekday != tm.weekday() and next_day != tm.day:
                    unix_time += 60 * 60 * 24 * 1
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time(
                                [tm.year, tm.month, tm.day, 0, 0, 0, 0, 0, -1]
                            )
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())
                    continue

            # weekdays - in python, monday = 0
            if (
                cron_dict["day_of_week"][0] != "*"
                and cron_dict["day_of_month"][0] == "*"
            ):
                next_weekday, wrap = self._find_next_time(
                    cron_dict["day_of_week"], tm.weekday(), 7
                )
                if next_weekday != tm.weekday():
                    delta_days = (next_weekday - tm.weekday() + 7) % 7
                    unix_time += 60 * 60 * 24 * delta_days
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time(
                                [tm.year, tm.month, tm.day, 0, 0, 0, 0, 0, -1]
                            )
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())
                    continue

            # day of month
            if (
                cron_dict["day_of_month"][0] != "*"
                and cron_dict["day_of_week"][0] == "*"
            ):
                next_day, wrap = self._find_next_time(
                    cron_dict["day_of_month"], tm.day, days_this_month
                )
                if next_day != tm.day:
                    if wrap:
                        unix_time += 60 * 60 * 24 * days_this_month
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time([tm.year, tm.month, 1, 0, 0, 0, 0, 0, -1])
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())
                    continue

            # month
            if cron_dict["month"][0] != "*":
                next_month, wrap = self._find_next_time(
                    cron_dict["month"], tm.month, 12
                )
                if next_month != tm.month:
                    year = tm.year
                    if wrap:
                        year += 1  # add year
                    tm = datetime.fromtimestamp(unix_time)
                    tm = datetime.fromtimestamp(
                        time.mktime(
                            time.struct_time([year, next_month, 1, 0, 0, 0, 0, 0, -1])
                        )
                    )
                    unix_time = time.mktime(tm.timetuple())
                    continue
            done = True

        _log.debug(
            "scheduled time: {}".format(
                time.strftime("%d %b %Y %H:%M:%S (UTC)", time.gmtime(unix_time))
            )
        )

        return unix_time


# does a regex check of the cron fields and range check for priority
# regex checks are not perfect, doesn't check for, e.g. 59-34
def validate_schedule_parameters(tsp: Dict) -> Optional[Tuple[str, int, Dict]]:
    # check validity
    if not _validate_cron_minute(tsp["cron_minute"]):
        _log.error("Invalid cron minute {}".format(tsp["cron_minute"]))
        return {
            "error": True,
            "msg": "Invalid cron_minute - must be *, (0-59), "
            "or comma/hyphen separated list of (0-59)",
        }

    if not _validate_cron_hour(tsp["cron_hour"]):
        _log.error("Invalid cron hour {}".format(tsp["cron_hour"]))
        return {
            "error": True,
            "msg": "Invalid cron_hour - must be *, (0-23), "
            "or comma/hyphen separated list of (0-23)",
        }

    if not _validate_cron_day_of_week(tsp["cron_day_of_week"]):
        _log.error("Invalid cron day of week {}".format(tsp["cron_day_of_week"]))
        return {
            "error": True,
            "msg": "Invalid cron_day_of_week - valid entries are "
            "integer (0-6) or full or 3-letter day "
            "or comma/hyphen separated list of valid entries or *",
        }

    if not _validate_cron_day_of_month(tsp["cron_day_of_month"]):
        _log.error("Invalid cron day of month {}".format(tsp["cron_day_of_month"]))
        return {
            "error": True,
            "msg": "Invalid cron_day_of_month - must be *, (1-31), "
            "or comma/hyphen separated list of (1-31)",
        }

    if not _validate_cron_month(tsp["cron_month"]):
        _log.error("Invalid cron month {}".format(tsp["cron_month"]))
        return {
            "error": True,
            "msg": "Invalid cron_month - must be *, (1-12) "
            "or comma/hyphen separated list of (1-12)",
        }

    if not tsp["asap"] and tsp["priority"] < 1:
        return {"error": True, "msg": "Priority must be >= 1"}

    return None


def _validate_cron_minute(st):
    # look for 1-2 digit number followed by 0 or more
    # (- or , followed by 1-2 digit number)
    # or allow "*"
    regex = "^(([0-5]?[0-9]((-|,)[0-5]?[0-9])*)|\\*)$"
    return True if re.match(regex, st) else False


def _validate_cron_hour(st):
    # 24-hour clock - looks for number between 0 and 23 followed by 0 or more
    # (- or , folowed by another valid hour)
    # or allow "*"
    regex = "^(((2[0-3]|[01]?[0-9])((-|,)(2[0-3]|[01]?[0-9]))*)|\\*)$"
    return True if re.match(regex, st) else False


def _validate_cron_day_of_month(st):
    # numbers 0-31 with commas or hyphens between them
    # or allow "*"
    # is not month-specific (doesn't check february 30 for example)
    regex = "^(((3[0-1]|[012]?[0-9])((-|,)(3[0-1]|[012]?[0-9]))*)|\\*)$"
    return True if re.match(regex, st) else False


def _validate_cron_month(st):
    # numbers 1-12 with commas or hyphens between them
    # or allow "*"
    regex = "^(((1[0-2]|[1-9])((-|,)(1[0-2]|[1-9]))*)|\\*)$"
    return True if re.match(regex, st) else False


def _validate_cron_day_of_week(st):
    # days of week as strings or numbers
    # or allow "*"
    days_of_week_abbr = "(mon|tue|wed|thu|fri|sat|sun)"
    days_of_week = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
    all_days = "[0]*[0-6]|" + days_of_week_abbr + "|" + days_of_week
    regex = "^(((" + all_days + ")((-|,)(" + all_days + "))*)|\\*)$"

    return True if re.match(regex, st, re.IGNORECASE) else False
