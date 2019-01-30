#!/usr/bin/env python3.6
# Copyright 2004-present Facebook. All Rights Reserved.

import locale
import logging
import time
from logging.handlers import RotatingFileHandler

import click
import requests


# create logger
_log = logging.getLogger(__name__)
_log.setLevel(logging.DEBUG)

# create console handler
console_logger = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_logger.setFormatter(formatter)

# create file handler. Limit the size of the file to 10MB
# logs will rollover to a new file after 10 MB
file_name = "/tmp/regression_{}.log".format(time.time())
file_logger = RotatingFileHandler(
    file_name, mode="a", maxBytes=10 * 1024 * 1024, backupCount=10
)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_logger.setFormatter(formatter)

# add console_logger and file_logger to logger
_log.addHandler(console_logger)
_log.addHandler(file_logger)


def getpreferredencoding(do_setlocale=True):
    return "utf-8"


locale.getpreferredencoding = getpreferredencoding
start_url = "http://localhost:8000/api/start_test/"
sleep_count = 30
total_iteration_count = 100


def run_test(
    test_code,
    topology_id,
    session_duration,
    test_push_rate,
    protocol,
    parse_phrase,
    traffic_direction=None,
    multi_hop_parallel_sessions=None,
    multi_hop_session_iteration_count=None,
):
    test_done = False
    attempt_count = 1
    iteration_count = 0

    _log.info("####### Start of {} Test #######\n".format(parse_phrase))
    while not test_done:
        _log.info("Attempt number: {}".format(attempt_count))
        run_test = requests.post(
            start_url,
            json={
                "test_code": test_code,
                "topology_id": topology_id,
                "session_duration": session_duration,
                "test_push_rate": test_push_rate,
                "protocol": protocol,
                "traffic_direction": traffic_direction,
                "multi_hop_parallel_sessions": multi_hop_parallel_sessions,
                "multi_hop_session_iteration_count": multi_hop_session_iteration_count,
            },
        )
        _log.info(run_test.text)
        attempt_count += 1

        # parse the HTTP response
        if parse_phrase in run_test.text:
            iteration_count += 1
            _log.info("Iteration count: {}".format(iteration_count))
        elif "test running on the network" in run_test.text:
            pass
        else:
            break

        # check if test has been run total_iteration_count number of times
        if iteration_count == total_iteration_count:
            test_done = True
        else:
            time.sleep(sleep_count)
        _log.info("\n")
    if iteration_count == total_iteration_count:
        _log.info("SUCCESS! Ran all iterations successfully. No unknown failures!")
    else:
        _log.info("FAILED! Something went wrong. Please investigate!")
    _log.info("Logs of this run are stored in {}\n".format(file_name))
    _log.info("####### End of the Test #######\n")


_default_options = [
    click.option(
        "-t",
        "--topology_id",
        prompt="Enter Topology ID",
        type=int,
        required=True,
        help="ID corresponding to the Topology.",
    ),
    click.option(
        "-d",
        "--session_duration",
        prompt="Enter Session Duration",
        type=int,
        required=True,
        help="Duration of each iperf/ping session.",
    ),
    click.option(
        "-r",
        "--test_push_rate",
        prompt="Enter Test Push Rate",
        type=int,
        required=True,
        help="Throughput push rate for iPerf.",
    ),
    click.option(
        "-p",
        "--protocol",
        prompt="Enter Protocol",
        type=str,
        required=True,
        help="iPerf traffic protocol.",
    ),
]

_multi_hop_options = [
    click.option(
        "-b",
        "--traffic_direction",
        prompt="Enter Traffic Direction",
        type=int,
        required=True,
        help="One of: bidirectional, POP -> node, node -> POP.",
    ),
    click.option(
        "-n",
        "--multi_hop_parallel_sessions",
        prompt="Enter Multi-hop Parallel Sessions",
        type=int,
        required=True,
        help="Number of iperf/ping sessions to run in parallel.",
    ),
    click.option(
        "-c",
        "--multi_hop_session_iteration_count",
        prompt="Enter Multi-hop Session Iteration Count",
        type=int,
        default=None,
        required=False,
        help="""Number of parallel iperf/ping sessions to
                run. (will stop once entire network is
                traversed if the option is larger than entire network)""",
    ),
]


def add_options(options):
    def _add_options(func):
        for option in reversed(options):
            func = option(func)
        return func

    return _add_options


# Command to run Parallel Link Health
@click.command()
@add_options(_default_options)
def parallel(topology_id, session_duration, test_push_rate, protocol):
    """ \b
    Test Name: Parallel Link Health.
    Test Objective: Verify that all links are healthy in the possible
                    presence of self interferenceself.
    """
    test_code = 8.3
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        parse_phrase="Parallel Link Health",
    )


# Command to run Sequential Link Health
@click.command()
@add_options(_default_options)
def sequential(topology_id, session_duration, test_push_rate, protocol):
    """ \b
    Test Name: Short Term Sequential Link Health.
    Test Objective: Verify link health in the absence of self interference.
    """
    test_code = 8.2
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        parse_phrase="Sequential Link Health",
    )


# Command to run Multi-hop Network Health
@click.command()
@add_options(_default_options)
@add_options(_multi_hop_options)
def multi_hop(
    topology_id,
    session_duration,
    test_push_rate,
    protocol,
    traffic_direction,
    multi_hop_parallel_sessions,
    multi_hop_session_iteration_count,
):
    """ \b
    Test Name: Multi-hop Network Health.
    Test Objective: Verify that all multi-hop routes are healthy.
    """
    test_code = 8.9
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        traffic_direction=traffic_direction,
        multi_hop_parallel_sessions=multi_hop_parallel_sessions,
        multi_hop_session_iteration_count=multi_hop_session_iteration_count,
        parse_phrase="Multi-hop Network Health",
    )


# Command to run all Test Plans sequentially
@click.command()
@add_options(_default_options)
@add_options(_multi_hop_options)
def all(
    topology_id,
    session_duration,
    test_push_rate,
    protocol,
    traffic_direction,
    multi_hop_parallel_sessions,
    multi_hop_session_iteration_count,
):
    """ \b
    Run all Test Plans sequentially
    """
    # run Parallel Link Health
    test_code = 8.3
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        parse_phrase="Parallel Link Health",
    )
    # run Sequential Link Health
    test_code = 8.2
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        parse_phrase="Sequential Link Health",
    )
    # run Multi-hop Network Health
    test_code = 8.9
    run_test(
        test_code=test_code,
        topology_id=topology_id,
        session_duration=session_duration,
        test_push_rate=test_push_rate,
        protocol=protocol,
        traffic_direction=traffic_direction,
        multi_hop_parallel_sessions=multi_hop_parallel_sessions,
        multi_hop_session_iteration_count=multi_hop_session_iteration_count,
        parse_phrase="Multi-hop Network Health",
    )


@click.group()
def regress():
    pass


regress.add_command(parallel)
regress.add_command(sequential)
regress.add_command(multi_hop)
regress.add_command(all)

if __name__ == "__main__":
    regress()
