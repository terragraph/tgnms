#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import requests


class E2EAPI(object):
    """
    E2E API related functions
    __init__ contains info about all the api end points used by NANO
    """

    def __init__(self, args, logger):
        # logger
        self.logger = logger

        # custom data structure
        self.end_point = {
            "topology": "/api/getTopology",
            "ctrl_status_dump": "/api/getCtrlStatusDump",
            "polarity_override": "/api/getNodeConfigPaths",
            "golay_override": "/api/getNodeConfigPaths",
            "link_params_base_fw_params": "/api/getNodeConfigPaths",
            "link_overrides_fw_params": "/api/getNodeConfigPaths",
            "set_node_overrides": "/api/setNodeOverridesConfig",
            "reset_scan": "/api/resetScanStatus",
            "scan_status": "/api/getScanStatus",
            "start_scan": "/api/startScan",
            "set_fw_log_config": "/api/setFwLogConfig",
            "get_default_routes": "/api/getDefaultRoutes",
        }

        # api url
        self.url = "{0}://{1}:{2}{3}".format(
            args.get("controller", {}).get("http_secure", "http"),
            args.get("controller", {}).get("api_ip", ""),
            args.get("controller", {}).get("api_port", ""),
            args.get("controller", {}).get("docker_swarm_api_url_prefix", ""),
        )

        # ssl verification
        self.ssl_verify = args.get("controller", {}).get("ssl_verify", True)

    def request(self, attribute, **kwargs):
        try:
            # construct url and body
            url = self.url + self.end_point[attribute]
            body = {}
            for key, value in kwargs.items():
                body["{0}".format(key)] = value
            self.logger.info("API url = {0}, post msg = {1}.".format(url, body))

            # post request
            response = requests.post(url, json=body, verify=self.ssl_verify)

            # validate response
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(
                    "Post request failed: {0} {1}".format(
                        response.status_code, response.text
                    )
                )
                return None
        except Exception as ex:
            self.logger.error("Post request failed: {0}".format(ex))
            return None


class WeatherAPI:
    """
    Weather API related functions
    __init__ contains info about all the api end points used by NANO
    """

    def __init__(self, weather_args):
        """
        @ params:
            weather_args: args["weather"]
        """
        # weather station api domain name
        self.ipv6_domain_name = weather_args.get("domain", {}).get("ipv6", None)
        self.ipv4_domain_name = weather_args.get("domain", {}).get("ipv4", None)

        # url endpoints
        self.weather_station_endpoint = weather_args.get("endpoint", None)

        # supported weather stations
        self.primary_station = weather_args.get("station", {}).get("primary", None)
        self.secondary_station = weather_args.get("station", {}).get("secondary", None)

    def get_weather_data(
        self, logger, timestamp="now", count=1, is_primary=True, ipv6=True
    ):
        """
        @ params:
            logger: logging object
            timestamp:
                format: unixtime or "now"
                description: Specifies which sample to pull from the weather station
                    time-series database. When provided in unixtime format,
                    the next nearest entry in the DB is returned. When left empty,
                    it defaults to "now", which returns the last (most recent)
                    entry in the DB.
            count:
                format: integer
                description: Defaults to 1. If >1 and station is set to a
                        specific ws identifier, maximum of "count"
                        entries will be returned
            is_primary:
                format: bool
                description: True for Primary weather station. False for Secondary.
            ipv6:
                format: bool
                description: False for IPv4 only clients
        """
        try:
            url = "https://{0}{1}".format(
                self.ipv6_domain_name if ipv6 else self.ipv4_domain_name,
                self.weather_station_endpoint,
            )
            station = self.primary_station if is_primary else self.secondary_station
            body = {"timestamp": timestamp, "station": station, "count": count}

            logger.debug("API url = {0}, post msg = {1}".format(url, body))
            return requests.post(url, json=body)
        except Exception as exp:
            logger.error(
                "Error in getting weather data from {0} using WeatherAPI: {1}".format(
                    url, exp
                )
            )
            logger.note(
                "Check if the weather parameters are correctly set in the config file."
            )
            return None
