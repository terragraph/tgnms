#!/usr/bin/env python3

from base import app, get_config_args
from modules.util_local_tg import LOCAL_TG
from perform_single_test import perform_single_test


def perform_weather_fetch(ptr, weather_info_fetch_interval=60):
    """
    perform periodic weather data fetch using weather station API

    @param ptr: state-machine state pointer
        - relative value w.r.t. app.config["time_gap"]
    @param weather_info_fetch_interval: weather data fetch interval
        - if weather_fetch process is enabled, default value is 1 min (60 seconds)
    """
    if ptr and isinstance(ptr, int):
        if weather_info_fetch_interval % app.config["time_gap"]:
            msg = "weather_info_fetch_interval must be divisible by time_gap, "
            app.logger.error(
                msg
                + "ptr = {0}, not fetch weather data, ".format(ptr)
                + "due to weird value in {0}".format(weather_info_fetch_interval)
            )
            return
        relative_time_elapsed = ptr % (
            weather_info_fetch_interval // app.config["time_gap"]
        )
        if not relative_time_elapsed:
            args = _prepare_args_for_weather_driven_test()
            weather_info = _get_current_weather_info(ptr, args)
            _perform_weather_driven_test(args, weather_info)
        else:
            msg = "not fetch weather data"
            next_update_time = weather_info_fetch_interval // app.config["time_gap"]
            app.logger.debug(
                "ptr = {0}, relative_time_elapsed = {1}, ".format(
                    ptr, relative_time_elapsed
                )
                + "next_update_time = {0}, {1}".format(next_update_time, msg)
            )
    else:
        msg = "ptr is not an integer; failed to fetch weather station data/info."
        app.logger.error("ptr = {0}, {1}, ".format(ptr, msg))


def _prepare_args_for_weather_driven_test():
    output_folder = "{0}/weather_fetch/".format(app.config["tmp_folder"])
    output_file_postfix = "{0}".format(app.config["network_name"])
    config_file = "{0}/config/{1}.json".format(
        app.config["fp"], app.config["network_name"]
    )
    args = {
        "output_folder": output_folder,
        "output_file_postfix": output_file_postfix,
        "test_config": "{}",
    }
    app.logger.debug(
        "Prepare args for weather fetch, config = {0}, output_folder = {1}".format(
            config_file, args["output_folder"]
        )
    )
    # get base config args + config file args + custom args
    return get_config_args(config_file=config_file, overwrite_args=args)


def _get_current_weather_info(ptr, args):
    app.logger.info(
        "ptr = {0}, fetch weather info/data, ".format(ptr)
        + "output_folder = {0}".format(args["output_folder"])
    )
    return _fetch_weather_info(args)


def _perform_weather_driven_test(args, weather_info):
    """
    Perform weather-driven performance test for TG KPI
    """
    if not weather_info:
        return
    try:
        weather_station = args.get("weather", {}).get("station", {}).get("primary")
        # obtain precip_rate from the latest weather data point
        latest_weather_info = weather_info.get(weather_station, [{}])[-1]
        precip_rate = latest_weather_info.get("rmmph", 0)
        precip_rate_threshold = args.get("weather", {}).get("precip_rate_threshold")
        app.logger.debug("Latest weather info = {0}".format(latest_weather_info))
    except BaseException as ex:
        app.logger.error(
            "Failed to obtain precip_rate from current weather info {0}, ".format(
                latest_weather_info
            )
            + "due to {0}".format(ex)
        )
    if precip_rate >= precip_rate_threshold:
        test_config = args.get("test_config", {})
        test_type = "weather-iperf-p2p"
        priority = 998
        app.logger.debug(
            "precip_rate {0}, start weather-driven {1} test_type".format(
                precip_rate, test_type
            )
        )
        # perform single test with highest prioirty, suspend any current/previous test
        status, msg = perform_single_test(test_type, test_config, priority, ptr=None)
        app.logger.debug("{0} test is {1}, msg = {2}".format(test_type, status, msg))
    else:
        app.logger.debug(
            "precip_rate {0} lower than threshold, API would not trigger test".format(
                precip_rate
            )
        )


def _fetch_weather_info(args):
    my_server = LOCAL_TG(
        args,
        loggerTag="weather_fetch",
        logPathDir=args["output_folder"],
        logFilePostfix=args["output_file_postfix"],
    )
    current_weather_info = my_server.fetch_weather_data()
    if current_weather_info:
        app.logger.info("Succeeded to obtain weather from API")
        my_server.update_weather_data_tracking_file(current_weather_info)
    else:
        app.logger.error("Failed to obtain weather from API")
    my_server.logger.disable()
    my_server = None
    return current_weather_info
