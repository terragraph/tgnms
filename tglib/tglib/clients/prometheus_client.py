#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import logging
from typing import Any, Dict, List, Optional, Pattern, Union, cast

import aiohttp

from tglib.clients.base_client import BaseClient, HealthCheckResult
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


@dataclasses.dataclass
class PrometheusMetric:
    """Representation of a single Prometheus metric."""

    name: str
    time: Union[int, float]
    labels: Dict[str, Any]
    value: Union[int, float]


class PrometheusClient(BaseClient):
    def __init__(self, config: Dict) -> None:
        if "prometheus" not in config:
            raise ConfigError("Missing required 'prometheus' key")

        prom_params = config["prometheus"]
        if not isinstance(prom_params, dict):
            raise ConfigError("Config value for 'prometheus' is not object")

        required_params = ["host", "port", "max_queue_size", "intervals"]
        if not all(param in prom_params for param in required_params):
            raise ConfigError(
                f"Missing one or more required 'prometheus' params: {required_params}"
            )

        self._host = prom_params["host"]
        self._port = prom_params["port"]
        self._max_queue_size = prom_params["max_queue_size"]
        self._stats_map: Dict[int, List[List[PrometheusMetric]]] = {
            i: [] for i in prom_params["intervals"]
        }
        self._session: Optional[aiohttp.ClientSession] = None

    async def start(self) -> None:
        if self._session is not None:
            raise ClientRestartError()

        self._session = aiohttp.ClientSession()

    async def stop(self) -> None:
        if self._session is None:
            raise ClientStoppedError()

        await self._session.close()
        self._session = None

    async def health_check(self) -> HealthCheckResult:
        if self._session is None:
            raise ClientStoppedError()

        url = f"http://{self._host}:{self._port}/api/v1/status/config"
        try:
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    return HealthCheckResult(client="PrometheusClient", healthy=True)

                return HealthCheckResult(
                    client="PrometheusClient",
                    healthy=False,
                    msg=f"{resp.reason} ({resp.status})",
                )
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            return HealthCheckResult(
                client="PrometheusClient", healthy=False, msg=f"{str(e)}"
            )

    def normalize(self, string: str) -> str:
        """Remove invalid characters in order to be Prometheus compliant."""
        return (
            string.replace(".", "_")
            .replace("-", "_")
            .replace("/", "_")
            .replace("[", "_")
            .replace("]", "_")
        )

    def create_query(self, metric_name: str, labels: Dict[str, Any]) -> str:
        """Form a Prometheus query from the metric_name and labels."""
        label_list = [] if "intervalSec" in labels else ['intervalSec="30"']

        for name, val in labels.items():
            if isinstance(val, Pattern):
                label_list.append(f'{name}=~"{val.pattern}"')
            else:
                label_list.append(f'{name}="{val}"')

        label_query = ",".join(label_list)
        return self.normalize(f"{metric_name}{{{label_query}}}")

    async def query_range(self, query: str, start: int, end: int, step: str) -> Dict:
        """Return the data for the given query and range."""
        if self._session is None:
            raise ClientStoppedError()

        if start > end:
            raise ValueError("Start time cannot be after end time")

        url = f"http://{self._host}:{self._port}/api/v1/query_range"
        params = {"query": query, "start": start, "end": end, "step": step}

        try:
            async with self._session.get(url, params=params) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError() from e

    async def query_latest(self, query: str) -> Dict:
        """Return the latest datum for the given query."""
        if self._session is None:
            raise ClientStoppedError()

        url = f"http://{self._host}:{self._port}/api/v1/query"
        params = {"query": query}

        try:
            async with self._session.get(url, params=params) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError() from e

    async def query_range_ts(self, query: str, start: int, end: int, step: str) -> Dict:
        """Return timestamp emissions corresponding to the query and range."""
        return await self.query_range(f"timestamp({query})", start, end, step)

    async def query_latest_ts(self, query: str) -> Dict:
        """Return the latest timestamp emission for the given query."""
        return await self.query_latest(f"timestamp({query})")

    def write_metrics(self, interval_sec: int, metrics: List[PrometheusMetric]) -> bool:
        """Add metrics to the provided interval_sec metric queue."""
        if interval_sec not in self._stats_map:
            logging.error(f"No metrics queue available for {interval_sec}s")
            return False

        queue = self._stats_map[interval_sec]
        if len(queue) >= self._max_queue_size:
            logging.error(f"The {interval_sec}s metrics queue is full.")
            return False

        queue.append(metrics)
        return True

    def poll_metrics(self, interval_sec: int) -> Optional[List[str]]:
        """Remove and return metrics for the given interval_sec."""
        if interval_sec not in self._stats_map:
            logging.error(f"No metrics queue available for {interval_sec}s")
            return None

        datapoints = []
        queue = self._stats_map[interval_sec]

        for metric_list in queue:
            for metric in metric_list:
                query = self.create_query(metric.name, metric.labels)
                datapoints.append(f"{query} {metric.value} {metric.time}")

        queue.clear()
        return datapoints
