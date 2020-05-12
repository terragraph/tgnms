#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import json
import logging
from typing import Any, Dict, List

import tglib
from aiohttp import web
from tglib import ClientType, init
from tglib.clients import APIServiceClient, PrometheusClient
from tglib.clients.prometheus_client import PrometheusMetric, consts
from tglib.exceptions import ClientRuntimeError

from .api_clients import OpenWeatherMapClient, WeatherAPIClient
from .weather import Coordinates, WeatherState


async def get_weather(weather_client, network_name, site_name, coordinates):
    return WeatherState(
        network_name=network_name,
        site_name=site_name,
        coordinates=coordinates,
        metrics=await weather_client.request(coordinates),
    )


async def fetch_weather_data(
    api_service_client: APIServiceClient, weather_client: WeatherAPIClient
) -> List[PrometheusMetric]:
    logging.info("Fetching network topology")

    topologies = await api_service_client.request_all(
        "getTopology", return_exceptions=True
    )

    # Using the fetched topology, create tasks for each site
    tasks = []
    for network_name, network in topologies.items():
        if isinstance(network, ClientRuntimeError):
            logging.info(f"Failed to fetch for {network_name}")
            continue

        for site in network["sites"]:
            coordinates = Coordinates(
                site["location"]["latitude"], site["location"]["longitude"]
            )

            task = get_weather(weather_client, network_name, site["name"], coordinates)
            tasks.append(task)

    # Launch the tasks to make requests to the weather API
    logging.info(f"Fetching weather for {len(tasks)} sites")
    weather_states = await asyncio.gather(*tasks)

    # Log data to Prometheus
    prometheus_metrics = []
    for weather_state in weather_states:
        metrics_dict = dataclasses.asdict(weather_state.metrics).items()

        labels = {
            consts.network: weather_state.network_name,
            consts.site_name: weather_state.site_name,
        }

        for name, metric in metrics_dict:
            if metric is None:
                continue
            prometheus_metrics.append(
                PrometheusMetric(
                    name=f"weather_{name}_{metric['unit']}",
                    labels=labels,
                    value=metric["value"],
                )
            )
    return prometheus_metrics


async def async_main(
    service_config: Dict[str, Any],
    api_service_client: APIServiceClient,
    weather_client: WeatherAPIClient,
) -> None:
    logging.info(
        f"Starting weather service with client {type(weather_client).__qualname__}"
    )
    logging.info(f"Config: {service_config}")

    while True:
        prometheus_metrics = await fetch_weather_data(
            api_service_client, weather_client
        )

        PrometheusClient.write_metrics(
            service_config["scrape_interval"], prometheus_metrics
        )
        logging.info("Updated prometheus cache with new data")

        await asyncio.sleep(service_config["weather_data_fetch_interval_seconds"])


def main():
    with open("./service_config.json") as f:
        service_config = json.load(f)

    weather_client = OpenWeatherMapClient(service_config["OpenWeatherMapKey"])
    api_service_client = APIServiceClient(timeout=5)

    return init(
        lambda: async_main(service_config, api_service_client, weather_client),
        {ClientType.API_SERVICE_CLIENT, ClientType.PROMETHEUS_CLIENT},
        web.RouteTableDef(),
    )


if __name__ == "__main__":
    main()
