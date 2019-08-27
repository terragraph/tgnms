#!/usr/bin/env python3

import argparse
import logging
import sys
from threading import Event

from api_endpoints import start_flask
from base import app, get_config_args
from modules.util_logger import EmptyLogger
from state_machine import initStateMachine


def main():
    parser = argparse.ArgumentParser(description="Network Analyzer Web API")
    parser.add_argument("name", help="network name")
    parser.add_argument(
        "--port", "-p", dest="port", action="store", help="running port of api server"
    )
    parser.add_argument("--host", dest="host", action="store", help="host ip")
    parser.add_argument(
        "--time-gap",
        dest="time_gap",
        action="store",
        type=int,
        help=(
            "specify the time gap (seconds) between every state-machine check; "
            "default is 1hr (3600 seconds)"
        ),
    )
    parser.add_argument(
        "--topo-update-interval",
        dest="topo_update_interval",
        action="store",
        type=int,
        help=(
            "specify the time gap (seconds) between every topology update; "
            "recommended value is 15 mins (900 seconds)"
        ),
    )
    parser.add_argument(
        "--get-default-routes",
        dest="get_default_routes",
        action="store",
        type=int,
        help=(
            "specify the time gap (seconds) between every API visit "
            "to fetch default route for all nodes of the network; "
            "recommended value is 600 seconds"
        ),
    )
    parser.add_argument(
        "--weather-info-fetch-interval",
        dest="weather_info_fetch_interval",
        action="store",
        type=int,
        help=(
            "specify the time gap (seconds) between every API visit "
            "to fetch weather station info, recommended value is 1 min (60 seconds)"
        ),
    )
    # NANO folder path
    parser.add_argument(
        "--folder-path",
        "-fp",
        dest="folder_path",
        action="store",
        help="NANO folder path (overwrite config file)",
    )
    # query limit
    parser.add_argument(
        "--query-limit",
        "-ql",
        dest="query_limit",
        action="store",
        type=int,
        help="specify query limit (overwrite config file)",
    )
    # debug mode
    parser.add_argument("--debug", "-d", action="store", help="debug mode")

    try:
        cli_args = vars(parser.parse_args())
        # only use cli params that are specified by the user
        cli_args = {
            "api_server_params": {key: val for key, val in cli_args.items() if val}
        }
    except BaseException:
        sys.exit(1)

    # config file path
    config_file = "../config/{0}.json".format(cli_args.get("name", "").lower())

    # get base config args + config file args + cli_args
    config_args = get_config_args(config_file=config_file, overwrite_args=cli_args)

    # prepare Flask API config
    _configure_api_server(
        api_args=config_args["api_server_params"], target_args=config_args["targets"]
    )

    # get Event object
    event = Event()
    # initialize state machine
    proc = initStateMachine(event)
    # state-machine is a separate thread
    proc.start()

    # run flask
    start_flask(
        host=config_args["api_server_params"]["host"],
        port=config_args["api_server_params"]["port"],
    )

    # stop state machine
    app.logger.debug("Stopping state machine.")
    event.set()
    proc.join()


def _configure_api_server(api_args, target_args):
    # prepare api server config params
    app.config["query_limit"] = api_args["query_limit"]
    app.config["time_gap"] = api_args["time_gap"]
    app.config["fp"] = api_args["folder_path"]
    app.config["network_name"] = api_args["name"].lower()
    app.config["tmp_folder"] = api_args["tmp_folder"]
    app.config["topo_update_interval"] = api_args["topo_update_interval"]
    app.config["get_default_routes"] = api_args["get_default_routes"]
    app.config["weather_info_fetch_interval"] = api_args["weather_info_fetch_interval"]

    # Prometheus related config
    app.config["target_folder"] = api_args["folder_path"] + target_args["folder_name"]
    app.config["target_json_file_name"] = target_args["json_file_name"]

    # configure NANO API logger
    app.logger = EmptyLogger(
        loggerTag="StateMachine",
        logPath=api_args["tmp_folder"] + api_args["api_server_log_file"],
        printout=True,
        printlevel=logging.DEBUG if api_args["debug"] else logging.INFO,
    )


main()
