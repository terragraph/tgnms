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
from tglib.utils.ip import format_address


@dataclasses.dataclass
class PrometheusMetric:
    """Representation of a single Prometheus metric."""

    time: Union[int, float]
    value: Union[int, float]


def normalize(string: str) -> str:
    """Remove invalid characters in order to be Prometheus compliant."""
    return (
        string.replace(".", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace("[", "_")
        .replace("]", "_")
    )


def create_query(metric_name: str, labels: Dict[str, Any] = {}) -> str:
    """Form a Prometheus query from the metric_name and labels."""
    label_list = [] if "intervalSec" in labels else ['intervalSec="30"']

    for name, val in sorted(labels.items()):
        if isinstance(val, Pattern):
            label_list.append(f'{name}=~"{val.pattern}"')
        else:
            label_list.append(f'{name}="{val}"')

    label_query = ",".join(label_list)
    return normalize(f"{metric_name}{{{label_query}}}")


class PrometheusClient(BaseClient):
    _addr: Optional[str] = None
    _metrics_map: Optional[Dict[int, Dict[str, PrometheusMetric]]] = None
    _session: Optional[aiohttp.ClientSession] = None

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._session is not None:
            raise ClientRestartError()

        prom_params = config.get("prometheus")
        required_params = ["host", "port", "intervals"]

        if prom_params is None:
            raise ConfigError("Missing required 'prometheus' key")
        if not isinstance(prom_params, dict):
            raise ConfigError("Config value for 'prometheus' is not object")
        if not all(param in prom_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        cls._addr = format_address(prom_params["host"], prom_params["port"])
        cls._metrics_map = {int(i): {} for i in prom_params["intervals"]}
        cls._session = aiohttp.ClientSession()

    @classmethod
    async def stop(cls) -> None:
        if cls._session is None:
            raise ClientStoppedError()

        await cls._session.close()
        cls._session = None

    @classmethod
    async def health_check(cls) -> HealthCheckResult:
        if cls._session is None:
            raise ClientStoppedError()

        url = f"http://{cls._addr}/api/v1/status/config"
        try:
            async with cls._session.get(url, timeout=1) as resp:
                if resp.status == 200:
                    return HealthCheckResult(client=cls.__name__, healthy=True)

                return HealthCheckResult(
                    client=cls.__name__,
                    healthy=False,
                    msg=f"{resp.reason} ({resp.status})",
                )
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            return HealthCheckResult(
                client=cls.__name__, healthy=False, msg=f"{str(e)}"
            )

    async def query_range(self, query: str, start: int, end: int, step: str) -> Dict:
        """Return the data for the given query and range."""
        if self._addr is None or self._session is None:
            raise ClientStoppedError()

        if start > end:
            raise ValueError("Start time cannot be after end time")

        url = f"http://{self._addr}/api/v1/query_range"
        params = {"query": query, "start": start, "end": end, "step": step}
        logging.debug(f"Requesting from {url} with params {params}")

        try:
            async with self._session.get(
                url, params=params, timeout=self.timeout
            ) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError() from e

    async def query_latest(self, query: str) -> Dict:
        """Return the latest datum for the given query."""
        if self._addr is None or self._session is None:
            raise ClientStoppedError()

        url = f"http://{self._addr}/api/v1/query"
        params = {"query": query}
        logging.debug(f"Requesting from {url} with params {params}")

        try:
            async with self._session.get(
                url, params=params, timeout=self.timeout
            ) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError() from e

    async def query_range_ts(self, query: str, start: int, end: int, step: str) -> Dict:
        """Return timestamp emissions corresponding to the query and range."""
        return await self.query_range(f"timestamp({query})", start, end, step)

    async def query_latest_ts(self, query: str) -> Dict:
        """Return the latest timestamp emission for the given query."""
        return await self.query_latest(f"timestamp({query})")

    @classmethod
    def write_metrics(
        cls, interval_sec: int, metrics: Dict[str, PrometheusMetric]
    ) -> bool:
        """Add new/update metrics to the given 'interval_sec' metric map."""
        if cls._metrics_map is None:
            raise ClientStoppedError()

        if interval_sec not in cls._metrics_map:
            logging.error(f"No metrics map available for {interval_sec}s")
            return False

        curr_metrics = cls._metrics_map[interval_sec]
        cls._metrics_map[interval_sec] = {**metrics, **curr_metrics}
        return True

    @classmethod
    def poll_metrics(cls, interval_sec: int) -> Optional[List[str]]:
        """Remove and return metrics for the given interval_sec."""
        if cls._metrics_map is None:
            raise ClientStoppedError()

        if interval_sec not in cls._metrics_map:
            logging.error(f"No metrics map available for {interval_sec}s")
            return None

        datapoints = []
        metrics = cls._metrics_map[interval_sec]

        for query, metric in metrics.items():
            datapoints.append(f"{query} {metric.value} {metric.time}")

        metrics.clear()
        return datapoints
