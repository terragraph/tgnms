#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import logging
import re
import time
from types import SimpleNamespace
from typing import Any, Dict, List, Optional, Pattern, Tuple, Union, cast

import aiohttp

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from ..utils.ip import format_address
from .base_client import BaseClient


# Tyoe alias: query_str -> (value, timestamp)
MetricCache = Dict[str, Tuple[Union[int, float], Optional[int]]]

# Common labels
consts = SimpleNamespace()
consts.node_mac = "nodeMac"
consts.node_name = "nodeName"
consts.is_pop = "pop"
consts.is_cn = "cn"
consts.site_name = "siteName"
consts.link_name = "linkName"
consts.link_direction = "linkDirection"
consts.data_interval = "intervalSec"
consts.network = "network"

# Built-in Prometheus query transformation operators/functions
ops = SimpleNamespace()
ops.avg_over_time = lambda query, interval: f"avg_over_time({query} [{interval}])"


@dataclasses.dataclass
class PrometheusMetric:
    """Representation of a single Prometheus metric.

    If provided, 'time' should be in milliseconds since epoch. To use the
    scrape timestamp, set 'honor_timestamps' to 'false' in the Prometheus
    config and omit the 'time' field."""

    name: str
    labels: Dict[str, Any]
    value: Union[int, float]
    time: Optional[int] = None


class PrometheusClient(BaseClient):
    _addr: Optional[str] = None
    _metrics_map: Optional[Dict[str, MetricCache]] = None
    _session: Optional[aiohttp.ClientSession] = None

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._session is not None:
            raise ClientRestartError()

        prom_params = config.get("prometheus")
        required_params = ["host", "port", "scrape_intervals"]

        if prom_params is None:
            raise ConfigError("Missing required 'prometheus' key")
        if not isinstance(prom_params, dict):
            raise ConfigError("Config value for 'prometheus' is not object")
        if not all(param in prom_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        cls._addr = format_address(prom_params["host"], prom_params["port"])
        cls._metrics_map = {i: {} for i in prom_params["scrape_intervals"]}
        cls._session = aiohttp.ClientSession()

    @classmethod
    async def stop(cls) -> None:
        if cls._session is None:
            raise ClientStoppedError()

        await cls._session.close()
        cls._session = None

    @staticmethod
    def normalize(string: str) -> str:
        """Remove invalid characters in order to be Prometheus compliant."""
        return (
            string.replace(".", "_")
            .replace("-", "_")
            .replace("/", "_")
            .replace("[", "_")
            .replace("]", "_")
        )

    @staticmethod
    def format_query(
        metric_name: str,
        labels: Dict[str, Any] = {},
        negate_labels: Dict[str, Any] = {},
    ) -> str:
        """Form a Prometheus query from the metric_name and labels."""
        label_list = []
        for name, val in labels.items():
            if isinstance(val, Pattern):
                label_list.append(f'{name}=~"{val.pattern}"')
            else:
                if isinstance(val, bool):
                    val = str(val).lower()
                label_list.append(f'{name}="{val}"')

        for name, val in negate_labels.items():
            if isinstance(val, Pattern):
                label_list.append(f'{name}!~"{val.pattern}"')
            else:
                if isinstance(val, bool):
                    val = str(val).lower()
                label_list.append(f'{name}!="{val}"')

        label_str = PrometheusClient.normalize(",".join(label_list))
        return f"{metric_name}{{{label_str}}}" if label_str else metric_name

    @classmethod
    def write_metrics(
        cls, scrape_interval: str, metrics: List[PrometheusMetric]
    ) -> bool:
        """Add/update metrics to the given scrape interval cache."""
        if cls._metrics_map is None:
            raise ClientStoppedError()
        if scrape_interval not in cls._metrics_map:
            logging.error(f"No metrics queue found for {scrape_interval}")
            return False

        # Format the incoming metrics
        curr_metrics = {}
        for metric in metrics:
            id = cls.format_query(metric.name, metric.labels)
            curr_metrics[id] = (metric.value, metric.time)

        prev_metrics = cls._metrics_map[scrape_interval]
        prev_metrics.update(curr_metrics)
        return True

    @classmethod
    def poll_metrics(cls, scrape_interval: str) -> Optional[List[str]]:
        """Scrape the metrics cache for the given scrape interval."""
        if cls._metrics_map is None:
            raise ClientStoppedError()

        if scrape_interval not in cls._metrics_map:
            logging.error(f"No metrics map available for {scrape_interval}")
            return None

        datapoints = []
        metrics = cls._metrics_map[scrape_interval]
        for id, (value, ts) in metrics.items():
            datapoints.append(f"{id} {value} {ts or ''}".rstrip())

        metrics.clear()
        return datapoints

    async def query_range(
        self, query: str, step: str, start: int, end: Optional[int] = None
    ) -> Dict:
        """Return the data for the given query and range.

        If not provided, the end time will default to the current unix time.
        """
        if self._addr is None or self._session is None:
            raise ClientStoppedError()
        if end is None:
            end = int(round(time.time()))

        duration_re = "[0-9]+[smhdwy]"
        if not re.match(duration_re, step):
            raise ValueError(f"Step resolution must be a valid duration, {duration_re}")
        if start > end:
            raise ValueError(f"Start time cannot be after end time: {start} > {end}")

        url = f"http://{self._addr}/api/v1/query_range"
        params = {"query": query, "start": start, "end": end, "step": step}
        logging.debug(f"Requesting from {url} with params {params}")

        try:
            async with self._session.get(
                url, params=params, timeout=self.timeout
            ) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"Query range request to {url} failed") from e

    async def query_latest(self, query: str, time: Optional[int] = None) -> Dict:
        """Return the latest datum for the given query.

        The current Prometheus server time is used as default if no evaluation
        timestamp is provided.
        """
        if self._addr is None or self._session is None:
            raise ClientStoppedError()

        url = f"http://{self._addr}/api/v1/query"
        params: Dict[str, Any] = {"query": query}
        if time is not None:
            params["time"] = time

        logging.debug(f"Requesting from {url} with params {params}")

        try:
            async with self._session.get(
                url, params=params, timeout=self.timeout
            ) as resp:
                return cast(Dict, await resp.json())
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"Query request to {url} failed") from e

    async def query_range_ts(
        self, query: str, step: str, start: int, end: Optional[int] = None
    ) -> Dict:
        """Return timestamp emissions corresponding to the query and range."""
        return await self.query_range(f"timestamp({query})", step, start, end)

    async def query_latest_ts(self, query: str, time: Optional[int] = None) -> Dict:
        """Return the latest timestamp emission for the given query.

        The current Prometheus server time is used as default if no
        evaluation timestamp is provided.
        """
        return await self.query_latest(f"timestamp({query})", time)
