#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import List

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric


async def add_x(start_time: int, metric_name: str, x: int) -> None:
    """Add 'x' to the latest value of 'metric_name'.

    Write the derived stat back to Prometheus using the same labels.
    """
    client = PrometheusClient(timeout=2)
    query = client.format_query(metric_name)
    response = await client.query_latest(query)
    assert response["status"] == "success"

    metrics: List[PrometheusMetric] = []
    for result in response["data"]["result"]:
        name = f"{metric_name}_plus_{x}"
        labels = result["metric"]
        value = result["value"][1]
        metrics.append(PrometheusMetric(name, labels, value, start_time))

    client.write_metrics(scrape_interval="30s", metrics=metrics)
