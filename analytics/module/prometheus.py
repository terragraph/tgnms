#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Provide Prometheus utilities and client.

This module provides a wrapper class for reading stats from Prometheus along
with several helper functions for formatting purposes.

Attributes:
    PrometheusTimeSeries
    replace_invalid_chars(str) -> str
    create_query(str, Dict[str, Any]) -> str
    PrometheusReader
"""

import asyncio
import dataclasses
import logging
import os
import re
from typing import Any, Dict, List, NoReturn

from module.http_client import HTTPClient


@dataclasses.dataclass
class PrometheusTimeSeries:
    """Struct for representing the results of a Prometheus range query."""

    values: List
    times: List
    metric_name: str
    labels: Dict[str, str]


def replace_invalid_chars(string: str) -> str:
    """Return a new string with invalid Prometheus characters replaced by '_'.

    Args:
        string: A raw Prometheus query.

    Returns:
        A new string with the '.', '-', '/', '[', and ']' replaced by '_'.
    """

    return (
        string.replace(".", "_")
        .replace("-", "_")
        .replace("/", "_")
        .replace("[", "_")
        .replace("]", "_")
    )


def create_query(metric_name: str, labels: Dict[str, Any]) -> str:
    """Construct a Prometheus query string.

    Joins the metric names and labels to form a Prometheus query in the
    following way:

    metric_name{labels.k1="labels.v1", labels.k2=~"labels.v2.pattern", ...}

    Adds a default intervalSec of 30 if one is not provided.

    Args:
        metric_name: Name of the metric to query.
        labels: Dictionary of label names to values. If the value is a regular
        expression, use '=~' for the given label instead of '='.

    Returns:
        A Prometheus query with any number of labels for additional filtering.
    """

    label_list = [] if "intervalSec" in labels else ['intervalSec="30"']

    for name, val in labels.items():
        if isinstance(val, re.Pattern):
            label_list.append(f'{name}=~"{val.pattern}"')
        else:
            label_list.append(f'{name}="{val}"')

    label_query = ", ".join(label_list)
    return replace_invalid_chars(f"{metric_name}{{{label_query}}}")


class PrometheusReader(HTTPClient):
    """Facilitate querying from Prometheus.

    host: Prometheus host
    port: Prometheus port

    Params:
        timeout: Session timeout.
    """

    host = os.getenv("PROMETHEUS_HOST")
    if host is None:
        raise ValueError("Missing 'PROMETHEUS_HOST' environment variable")

    port = os.getenv("PROMETHEUS_PORT")
    if port is None:
        raise ValueError("Missing 'PROMETHEUS_PORT' environment variable")

    def __init__(self, timeout: int = 5) -> NoReturn:
        super().__init__(self.host, self.port, timeout)

    async def read_range_stat(
        self,
        metric_name: str,
        start_time: int,
        end_time: int,
        step: str,
        labels: Dict[str, Any],
    ) -> List[PrometheusTimeSeries]:
        """Return the results of a range query request to Prometheus.

        Issues two queries to Prometheus, one for the metric data and a second
        for the timestamp data. If either request fails, return an empty list.

        Both queries are necessary since Prometheus doesn't return the actual
        timestamps that the stats are emitted in the data request, but rather
        uses the step to sample.

        e.g.

        start = 100
        end = 250
        step = 50

        data = [(100, 8.5), (150, 8.5), (200, 9.2), (250, 9.0)]
        timestamp = [(100, 99), (150, 99), (200, 200), (250, 245)]

        The sampled time is used to identify stale or duplicate data.

        Args:
            metric_name: Name of the metric to query.
            start_time: Start timestamp.
            end_time: End timestamp.
            step: Query resolution step width, e.g. 30s, 1h
            labels: Dictionary of labels to values to filter the request.

        Returns:
            A list of PrometheusTimeSeries, one per entity that matched the
            query.

        Raises:
            RuntimeError: The entity order of metric and timestamp data didn't
            match.
        """

        data_query = create_query(metric_name, labels)

        # Construct request payloads
        data_params = {
            "query": data_query,
            "start": start_time,
            "end": end_time,
            "step": step,
        }

        timestamp_params = {
            "query": f"timestamp({data_query})",
            "start": start_time,
            "end": end_time,
            "step": step,
        }

        # Request the metric data and timestamps from Prometheus
        data, timestamps = await asyncio.gather(
            self.get("api/v1/query_range", data_params),
            self.get("api/v1/query_range", timestamp_params),
        )

        # Return early if either request failed
        if data is None or timestamps is None:
            return []

        if data["status"] == "error":
            logging.error(
                f"An error occurred while reading {metric_name} data from Prometheus: "
                f"{data['error']} ({data['errorType']})"
            )
            return []

        if timestamps["status"] == "error":
            logging.error(
                "An error occurred while reading timestamp data from Prometheus: "
                f"{data['error']} ({data['errorType']})"
            )
            return []

        # Process the valid results and add them ts_list
        ts_list = []

        for d_res, t_res in zip(data["data"]["result"], timestamps["data"]["result"]):
            # Compare the labels to confirm we're looking at the same data source
            if not (t_res["metric"].items() <= d_res["metric"].items()):
                raise RuntimeError(
                    f"{metric_name} and timestamp data sources are not aligned!"
                )

            prev_t_val = None
            values = []
            times = []

            for d_val, t_val in zip(d_res["values"], t_res["values"]):
                # Skip stale data
                if float(t_val[1]) <= start_time - step:
                    continue

                # Skip data we've seen before
                if prev_t_val is not None and prev_t_val[1] == t_val[1]:
                    continue

                values.append(d_val[1])
                times.append(t_val[1])
                prev_t_val = t_val

            ts_list.append(
                PrometheusTimeSeries(values, times, metric_name, d_res["metric"])
            )

        return ts_list
