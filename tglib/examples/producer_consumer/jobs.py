#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, List

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric


async def add_x(start_time: int, metric_name: str, x: int) -> None:
    """Add 'x' to the latest value of 'metric_name'"""
    client = PrometheusClient(timeout=2)

    query = client.create_query(metric_name=metric_name)
    response = await client.query_latest(query)
    assert response["status"] == "success"

    metrics: Dict[str, PrometheusMetric] = {}
    for result in response["data"]["result"]:
        labels = result["metric"]
        value = result["value"][1]
        id = client.create_query(metric_name=f"{metric_name}_plus_{x}", labels=labels)
        metrics[id] = PrometheusMetric(value=value + x, time=start_time)

    client.write_metrics(interval_sec=30, metrics=metrics)
