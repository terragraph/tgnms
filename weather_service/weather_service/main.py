#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from typing import Any, Awaitable, Dict, List, NoReturn

from aiohttp import web
from tglib import init
from tglib.clients import APIServiceClient, PrometheusClient
from tglib.clients.prometheus_client import PrometheusMetric, consts
from tglib.exceptions import ClientRuntimeError

from .api_clients import ClimaCellClient, OpenWeatherMapClient, WeatherAPIClient
from .weather import Coordinates, WeatherState


async def get_weather(
    weather_client: WeatherAPIClient,
    network_name: str,
    site_name: str,
    coordinates: Coordinates,
) -> WeatherState:
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
    tasks: List[Awaitable[WeatherState]] = []
    for network_name, network in topologies.items():
        if isinstance(network, ClientRuntimeError):
            logging.info(f"Failed to fetch topology for {network_name}")
            continue

        for site in network["sites"]:
            coordinates = Coordinates(
                site["location"]["latitude"], site["location"]["longitude"]
            )

            task = get_weather(weather_client, network_name, site["name"], coordinates)
            tasks.append(task)

    # Launch the tasks to make requests to the weather API
    logging.info(f"Fetching weather for {len(tasks)} sites")
    weather_states = await asyncio.gather(*tasks, return_exceptions=True)

    # Log data to Prometheus
    prometheus_metrics = []
    logging.info(f"Done fetching {len(weather_states)} weather states")
    for weather_state in weather_states:
        if isinstance(weather_state, Exception):
            logging.info(f"Failed to fetch weather data: {str(weather_state)}")
            continue
        if weather_state.metrics is None:
            continue

        labels = {
            consts.network: weather_state.network_name,
            consts.site_name: weather_state.site_name,
        }

        for name, metric in weather_state.metrics.flat_metrics().items():
            if metric is None or metric.value is None:
                continue
            prometheus_metrics.append(
                PrometheusMetric(
                    name=f"weather_{name}_{metric.unit}",
                    labels=labels,
                    value=metric.value,
                )
            )
    return prometheus_metrics


def get_weather_client(service_config: Dict[str, Any]) -> WeatherAPIClient:
    valid_keys = {"climacell_api_key", "openweathermap_api_key"}
    # Find which of the available APIs is selected and use it (error if more
    # than 1 API key is provided)
    api_keys_present = [key for key in service_config.keys() if key in valid_keys]
    if len(api_keys_present) != 1:
        raise RuntimeError(f"Exactly 1 of {valid_keys} should be provided")
    client_name = api_keys_present[0]
    api_key = service_config[client_name]

    if client_name == "climacell_api_key":
        return ClimaCellClient(api_key)
    elif client_name == "openweathermap_api_key":
        return OpenWeatherMapClient(api_key)
    raise ValueError(f"Unknown client {client_name}")


async def async_main(service_config: Dict[str, Any]) -> NoReturn:
    logging.info(f"Config: {service_config}")

    api_service_client = APIServiceClient(timeout=5)

    async with get_weather_client(service_config) as weather_client:
        logging.info(
            f"Starting weather service with client {weather_client.__class__.__name__}"
        )

        while True:
            PrometheusClient.write_metrics(
                await fetch_weather_data(api_service_client, weather_client)
            )
            logging.info("Updated prometheus cache with new data")

            await asyncio.sleep(service_config["weather_data_fetch_interval_seconds"])


def main() -> None:
    try:
        with open("./service_config.json") as f:
            service_config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(service_config),
        {APIServiceClient, PrometheusClient},
        web.RouteTableDef(),
    )


if __name__ == "__main__":
    main()
