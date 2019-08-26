#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import List

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric


async def add_x(start_time: int, metric_name: str, x: int) -> None:
    """Add 'x' to the latest value of 'metric_name'"""
    client = PrometheusClient.get_instance()

    query = client.create_query(metric=metric_name)
    response = await client.query_latest(query)
    assert response["status"] == "success"

    metrics: List[PrometheusMetric] = []
    for result in response["data"]["result"]:
        metric = result["metric"]
        value = result["value"][1]
        metrics.append(
            PrometheusMetric(
                name=f"{metric_name}_plus_{x}",
                time=start_time,
                labels=metric,
                value=value + x,
            ),
        )

    client.write_metrics(interval_sec=30, metrics=metrics)
