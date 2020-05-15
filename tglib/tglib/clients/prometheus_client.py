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


# Common labels
consts = SimpleNamespace()
consts.data_interval_s = "intervalSec"
consts.is_cn = "cn"
consts.is_pop = "pop"
consts.link_direction = "linkDirection"
consts.link_name = "linkName"
consts.network = "network"
consts.node_mac = "nodeMac"
consts.node_name = "nodeName"
consts.site_name = "siteName"

# Built-in Prometheus query transformation operators/functions
ops = SimpleNamespace()
ops.avg_over_time = lambda query, interval: f"avg_over_time({query} [{interval}])"
ops.count_over_time = lambda query, interval: f"count_over_time({query} [{interval}])"
ops.delta = lambda query, interval: f"delta({query} [{interval}])"
ops.max_over_time = lambda query, interval: f"max_over_time({query} [{interval}])"
ops.rate = lambda query, interval: f"rate({query} [{interval}])"
ops.resets = lambda query, interval: f"resets({query} [{interval}])"
ops.max_over_time = lambda query, interval: f"max_over_time({query} [{interval}])"


@dataclasses.dataclass
class PrometheusMetric:
    """Representation of a single Prometheus metric.

    If provided, ``time`` should be in milliseconds since epoch. To use
    the scrape timestamp, set ``honor_timestamps`` to ``false`` in Prometheus'
    scrape configuration file and omit the ``time`` field here.

    Args:
        name: The name of the metric.
        labels: The labels and values in Python dictionary form.
        value: The metric value.
        time: The emission timestamp, in milliseconds.
    """

    name: str
    labels: Dict[str, Any]
    value: Union[int, float]
    time: Optional[int] = None


class PrometheusClient(BaseClient):
    """A client for reading and writing timeseries metrics to Prometheus.

    Args:
        timeout: The request timeout, in seconds.
    """

    _addr: Optional[str] = None
    _metrics: Optional[Dict[str, Tuple[Union[int, float], Optional[int]]]] = None
    _session: Optional[aiohttp.ClientSession] = None

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout

    @classmethod
    async def start(cls, config: Dict[str, Any]) -> None:
        """Initialize the underlying HTTP client session pool.

        Args:
            config: Params and values for configuring the client.

        Raises:
            ClientRestartError: The HTTP client session pool has already been initialized.
            ConfigError: The ``config`` argument is incorrect/incomplete.
        """
        if cls._session is not None:
            raise ClientRestartError()

        prom_params = config.get("prometheus")
        required_params = ["host", "port"]

        if prom_params is None:
            raise ConfigError("Missing required 'prometheus' key")
        if not isinstance(prom_params, dict):
            raise ConfigError("Config value for 'prometheus' is not object")
        if not all(param in prom_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        cls._addr = format_address(prom_params["host"], prom_params["port"])
        cls._metrics = {}
        cls._session = aiohttp.ClientSession(trust_env=True)

    @classmethod
    async def stop(cls) -> None:
        """Cleanly shut down the HTTP client session pool.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
        """
        if cls._session is None:
            raise ClientStoppedError()

        await cls._session.close()
        cls._session = None

    @staticmethod
    def normalize(value: str) -> str:
        """Remove invalid characters in order to be Prometheus compliant.

        Args:
            value: The raw string input.

        Returns:
            A new normalized string with invalid characters replaced with an underscore.

        Example:
            >>> PrometheusClient.normalize("link-node1-node2")
            link_node1_node2
        """
        return (
            value.replace(".", "_")
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
        """Form a PromQL query from the parameters.

        Args:
            metric_name: The Prometheus metric name.
            labels: The dictionary of labels to **positive** matching values.
            negate_labels: The dictionary of labels to **negative** matching values.

        Returns:
            A PromQL formatted query string.

        Note:
            If a value is given of type :class:`typing.Pattern`, then the ``~`` character is automatically
            added to the label assignment.

        Example:
            >>> PrometheusClient.format_query("foo", labels={"nodeName": "node1"}, negate_labels={"network": re.compile("test*")})
            foo{nodeName="node1",network!~"test*"}
            >>> PrometheusClient.format_query("bar", labels={"linkName": re.compile("link1|link2")}, negate_labels={"network":"test_net"})
            bar{linkName=~"link1|link2",network!="test_net"}
        """
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
    def write_metrics(cls, metrics: List[PrometheusMetric]) -> None:
        """Add/update metrics to the metric cache.

        Args:
            metrics: The list of PrometheusMetric objects to save to the cache.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.

        Attention:
            This method will overwrite :class:`PrometheusMetric` values with duplicate
            ``name`` and ``labels`` values in between Prometheus scrapes.
        """
        if cls._metrics is None:
            raise ClientStoppedError()

        # Format the incoming metrics
        curr_metrics = {}
        for metric in metrics:
            query_str = cls.format_query(metric.name, metric.labels)
            curr_metrics[query_str] = (metric.value, metric.time)

        cls._metrics.update(curr_metrics)

    @classmethod
    def poll_metrics(cls) -> List[str]:
        """Scrape the metrics cache.

        Returns:
            A list of metrics, in PromQL form.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
        """
        if cls._metrics is None:
            raise ClientStoppedError()

        datapoints = []
        for query_str, (value, ts) in cls._metrics.items():
            datapoints.append(f"{query_str} {value} {ts or ''}".rstrip())

        cls._metrics.clear()
        return datapoints

    async def query_range(
        self, query: str, step: str, start: int, end: Optional[int] = None
    ) -> Dict:
        """Return the timeseries data for the given PromQL query and time range.

        Args:
            query: The PromQL string query.
            step: The query step resolution width in duration format.
            start: The start unix timestamp in seconds.
            end: The end unix timestamp in seconds.

        Returns:
            The Prometheus JSON response as a Python dictionary.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: The request failed or timed out.

        Note:
            If not provided, ``end`` will default to the current unix time.
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

        Args:
            query: The PromQL string query.
            time: The evaluation unix timestamp in seconds.

        Returns:
            The Prometheus JSON response as a Python dictionary.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: The request failed or timed out.

        Note:
            If not provided, ``time`` will default to the Prometheus server time.
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
        """Return timestamp emissions corresponding to the query and range.

        Args:
            query: The PromQL string query.
            step: The query step resolution width in duration format.
            start: The start unix timestamp in seconds.
            end: The end unix timestamp in seconds.

        Returns:
            The Prometheus JSON response as a Python dictionary.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: The request failed or timed out.

        Note:
            If not provided, ``end`` will default to the current unix time.
        """
        return await self.query_range(f"timestamp({query})", step, start, end)

    async def query_latest_ts(self, query: str, time: Optional[int] = None) -> Dict:
        """Return the latest timestamp emission for the given query.

        Args:
            query: The PromQL string query.
            time: The evaluation unix timestamp in seconds.

        Returns:
            The Prometheus JSON response as a Python dictionary.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: The request failed or timed out.

        Note:
            If not provided, ``time`` will default to the Prometheus server time.
        """
        return await self.query_latest(f"timestamp({query})", time)
