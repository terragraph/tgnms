#!/usr/bin/env python3

from subprocess import CalledProcessError, Popen, check_output

import modules.keywords as KEY
from base import MULTI_THREAD_LOCK, app
from modules.util_mongo_db import datetime2string, get_current_datetime


def perform_single_test(testType, testConfig, priority, ptr=None):
    """
    perform single test
    """
    app.logger.debug(
        "entering perform_single_test: testType=`{}`, testConfig={}, ptr={}".format(
            testType, testConfig, ptr
        )
    )
    # count current state attempts
    if ptr is not None and isinstance(ptr, int):
        MULTI_THREAD_LOCK.acquire()
        app.logger.debug("increment state attempts")
        app.config["states"][ptr][3] += 1
        app.logger.debug("new count: {}".format(app.config["states"][ptr][3]))
        MULTI_THREAD_LOCK.release()
    # external/manual test running check - prevent conflicts
    # if found process running
    if validate_test_running():
        if not app.config["curr_state"]:
            # but it is not in state machine on record, set to `unknown`
            # set very high priority as we do not want to mess up with
            # something we do not know
            MULTI_THREAD_LOCK.acquire()
            app.logger.debug("found unknown test running")
            app.config["curr_state"] = "unknown-test"
            app.config["curr_start_time"] = "unknown-time"
            app.config["curr_priority"] = 998
            MULTI_THREAD_LOCK.release()
        msg = "{} is still running".format(app.config["curr_state"])
        app.logger.note(msg)
        # if low priority, skip
        if priority <= app.config["curr_priority"]:
            testType and app.logger.debug(
                "ignoring new test {}; current priority {} vs running {}".format(
                    testType, app.config["curr_priority"], priority
                )
            )
            if ptr is not None:
                app.logger.debug("incrementing failure counts")
                # count test failures
                app.config["states"][ptr][4] += 1
            return False, msg
        # due to higher priority, suspend previous test
        app.logger.debug("suspending test {}".format(app.config["curr_state"]))
        if not suspend_running_test():
            msg = "failed to suspend {}".format(app.config["curr_state"])
            app.logger.error(msg)
            return False, msg
    # otherwise we are safe to run a new test
    MULTI_THREAD_LOCK.acquire()
    app.logger.debug("move current state to prev state")
    app.config["prev_state"] = app.config["curr_state"]
    app.config["prev_start_time"] = app.config["curr_start_time"]
    app.config["prev_end_time"] = datetime2string(get_current_datetime())
    MULTI_THREAD_LOCK.release()
    app.logger.info(
        "{0} test started at {1} and finished at {2}".format(
            app.config["prev_state"],
            app.config["prev_start_time"],
            app.config["prev_end_time"],
        )
    )
    # no new test will be done
    if not testType:
        MULTI_THREAD_LOCK.acquire()
        app.config["curr_state"] = ""
        app.logger.note("nothing scheduled")
        MULTI_THREAD_LOCK.release()
        return False, ""
    app.logger.debug("running new test {}".format(testType))
    # get command
    cmd = get_single_test_command(testType, testConfig)
    # run command
    app.logger.debug("running command {0}".format(cmd))
    p = Popen(cmd, shell=True)
    app.logger.debug("checking if process running")
    # the command is running
    if p.poll() is None:
        MULTI_THREAD_LOCK.acquire()
        app.logger.debug("process is running! changing state")
        app.config["curr_start_time"] = datetime2string(get_current_datetime())
        app.config["curr_state"] = testType
        app.config["curr_priority"] = priority
        MULTI_THREAD_LOCK.release()
        app.logger.info(
            "{0} test starts at {1}".format(testType, app.config["curr_start_time"])
        )
        return True, "success"
    # otherwise, command fails to run
    app.logger.debug("process failed to run")
    if ptr is not None:
        app.logger.debug("incrementing failure count")
        # count current state failure
        app.config["states"][ptr][4] += 1
    return False, "failed to run command"


def validate_test_running():
    """
    validate if any test is runnign or not
    """
    try:
        output = check_output(
            ["ps -ef | grep -v grep | grep -e self_test -e RunTests"], shell=True
        )
    except CalledProcessError as ex:
        # exit code 1 means found nothing
        if ex.returncode is not 1:
            # if unrecognized command, prevent further test runs
            app.logger.error("Unknown return code {}".format(ex.returncode))
            return True
        # otherwise, found nothing
        return False
    app.logger.debug(output)
    return True


def suspend_running_test():
    """
    suspend running test via signal.SIGKILL
    """
    if not validate_test_running():
        return True
    try:
        check_output(
            [
                "kill -9 $(ps aux | grep -v grep | "
                + "grep -e self_test -e RunTests | awk '{print $2}')"
            ],
            shell=True,
        )
        check_output(
            ["ps -ef | grep -v grep | grep -e self_test -e RunTests"], shell=True
        )
    except CalledProcessError as ex:
        # exit code 1 means found nothing
        if ex.returncode is not 1:
            return False
        # update state machine current status
        MULTI_THREAD_LOCK.acquire()
        if not app.config["curr_state"]:
            app.config["curr_state"] = "unknown-test"
            app.config["curr_start_time"] = "unknown-time"
        app.config["prev_state"] = app.config["curr_state"]
        app.config["prev_start_time"] = app.config["curr_start_time"]
        app.config["prev_end_time"] = datetime2string(get_current_datetime())
        app.config["curr_state"] = ""
        MULTI_THREAD_LOCK.release()
        return True
    return False


def get_single_test_command(testType, testConfig):
    """
    derive the command to run self_test.py
    """
    cmd = "python {0}/tool/self_test.py {1}_{2} ".format(
        app.config["fp"], app.config["network_name"], testType
    ) + "--config {0}/config/{1}.json ".format(
        app.config["fp"], app.config["network_name"]
    )
    if testConfig.get("email"):
        cmd += "--email_extra {0} ".format(testConfig["email"])
    if testType in ["iperf-p2p", "weather-iperf-p2p"]:
        # alignment is disabled by default now, need to add this to iperf
        cmd += (
            # alignment will use parallel mode
            "--alignment --iperf "
            + _handler_subcommand("iperf", "duration", testConfig)
            + _handler_subcommand("iperf", "rate", testConfig)
            + _handler_subcommand("iperf", "type", testConfig)
        )
    elif testType == "ping-p2p":
        cmd += "--alignment --ping "
    elif "imscan" in testType:
        if testType == "imscan":
            cmd += "--alignment --im --scan-mode {0} ".format(KEY.SCAN_MODE_FINE)
        elif testType == "imscan-relative":
            cmd += "--im --scan-mode {0} ".format(KEY.SCAN_MODE_RELATIVE)
        if testConfig.get("interference_polarity"):
            cmd += "--interference-polarity "
    elif testType == "multihop":
        _prepare_multihop_cmd(cmd, testConfig)
    else:
        app.logger.debug(
            "testType = {0} and testCfg = {1} in get_single_test_command".format(
                testType, testConfig
            )
        )
    # method config: sequential or parallel
    if testConfig.get("method"):
        cmd += "--{0}".format(testConfig["method"])
    return cmd


def _handler_subcommand(typename, fn, testConfig):
    return (
        "--{0}-{1} {2} ".format(typename, fn, testConfig[fn])
        if testConfig.get(fn)
        else ""
    )


def _prepare_multihop_cmd(cmd, testConfig):
    cmd += (
        "--multihop "
        + _handler_subcommand("multihop", "duration", testConfig)
        + _handler_subcommand("multihop", "rate", testConfig)
        + _handler_subcommand("multihop", "sessions", testConfig)
        + _handler_subcommand("multihop", "direction", testConfig)
        + _handler_subcommand("multihop", "type", testConfig)
        + _handler_subcommand("multihop", "tcpcongestctrl", testConfig)
    )
    if testConfig.get("option") and testConfig["option"] != "no_option":
        cmd += "--{}-{} {} ".format("multihop", "option", testConfig["option"])
