#!/usr/bin/env python3

import sys
from threading import Thread

from base import app
from modules.util_mongo_db import LOCAL_ZONE, get_current_datetime
from perform_single_test import perform_single_test
from services.default_routes_service import get_default_routes
from services.weather_service import perform_weather_fetch


def state_machine_backend(event):
    """
    state machine backend
    """
    # set initial ptr to match current machine time
    currentT = get_current_datetime()
    currentT = currentT.astimezone(LOCAL_ZONE)
    ptr = (currentT.hour * 3600 + currentT.minute * 60) // app.config["time_gap"]
    app.logger.debug("initial ptr={}".format(ptr))

    while 1:
        app.logger.debug(
            "prev_state={0}; ".format(app.config["prev_state"])
            + "prev_start_time={0}; ".format(app.config["prev_start_time"])
            + "prev_end_time={0}; ".format(app.config["prev_end_time"])
            + "curr_state={0}; ".format(app.config["curr_state"])
            + "curr_priority={0}; ".format(app.config["curr_priority"])
            + "curr_start_time={0}; ".format(app.config["curr_start_time"])
            + "ptr={0}; ".format(ptr)
            + "state_machine={0}".format(app.config["states"][ptr])
        )

        # check/start single test in a separate thread
        test_proc = Thread(
            target=perform_single_test,
            args=(
                app.config["states"][ptr][0],
                app.config["states"][ptr][1],
                app.config["states"][ptr][2],
                ptr,
            ),
        )

        # if get_default_routes is configured, start get default routes service
        if app.config["get_default_routes"]:
            default_routes_proc = Thread(target=get_default_routes, args=[ptr])
            default_routes_proc.start()

        # if weather_info_fetch_interval is configured, start weather data service
        if app.config["weather_info_fetch_interval"]:
            weather_proc = Thread(
                target=perform_weather_fetch,
                args=(ptr, app.config["weather_info_fetch_interval"]),
            )
            weather_proc.start()

        # check if any NANO test is running on the network
        test_proc.start()

        # sleep for time_gap duration
        event.wait(timeout=app.config["time_gap"])

        # exit if Event internal flag is set
        if event.is_set():
            break

        ptr = (ptr + 1) % len(app.config["states"])
        # re-sync ptr to match current machine time
        if ptr == len(app.config["states"]) - 1:
            currentT = get_current_datetime()
            currentT = currentT.astimezone(LOCAL_ZONE)
            ptr = (currentT.hour * 3600 + currentT.minute * 60) // app.config[
                "time_gap"
            ]
            app.logger.debug("resynced ptr={}".format(ptr))


def initStateMachine(event):
    """
    start and configure the state machine
    maybe not the best way to implement a state machine but it works :)
    """
    if not 86400 % app.config["time_gap"] == 0:
        app.logger.error("time gap must be divisible by 86400")
        sys.exit(1)
    if app.config["time_gap"] < 10:  # limit state machine freq
        app.logger.error("time gap is way too small to handle")
        sys.exit(1)
    # initialize states
    # structure:
    # [[test name, test config, priority, attempts, failures], ...]
    app.config["states"] = [
        ["", {}, 0, 0, 0] for __ in range((86400 // app.config["time_gap"]))
    ]
    # hold the previous test type (finished)
    app.config["prev_state"] = ""
    # hold the previous start time
    app.config["prev_start_time"] = ""
    # hold the previous end time
    app.config["prev_end_time"] = ""
    # hold the current test type (running)
    app.config["curr_state"] = ""
    # hold the current test priority
    app.config["curr_priority"] = 0
    # hold the current start time
    app.config["curr_start_time"] = ""
    # spawn state machine process
    return Thread(target=state_machine_backend, args=[event])
