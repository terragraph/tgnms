#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging

from elasticsearch import AsyncElasticsearch
from typing import Dict, List, Tuple

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric

from .utils.crash_analysis_runner import analyze_log, group_crashes
from .utils.crash_details import CrashDetails
from .utils.crash_key import CrashKey
from .utils.utils import (
    get_crash_logs_from_elasticsearch,
    get_prometheus_label_from_key,
    save_crash_details_to_db,
)


async def analyze_crash_logs(
    start_time_ms: int, es: AsyncElasticsearch, es_indices: List[str]
) -> None:

    # Step 1. Read and process logs into List[str]
    # Step 2. Run log through crash analyzer and create a CrashDetails for it
    # Step 3. Write the crash detail to SQL
    # Step 4. Write a data point to prometheus
    # Step 5. Summarize the crashes by querying the SQL table

    # --- Step 1 ---
    crash_logs: Dict[
        Tuple[str, str], List[str]
    ] = await get_crash_logs_from_elasticsearch(start_time_ms, es_indices, es)

    # --- Step 2 ---
    crash_details: List[CrashDetails] = []
    for (node_name, log_file), log in crash_logs.items():
        crash_details.extend(analyze_log(log, log_file, node_name))

    # --- Step 3 ---
    await save_crash_details_to_db(crash_details)

    # --- Step 4 ---
    metrics: List[PrometheusMetric] = []
    crash_groups: List[CrashKey] = [
        CrashKey(crash_type=""),
        CrashKey(crash_time=""),
        CrashKey(node_id=""),
        CrashKey(application=""),
    ]
    # group by crash type
    for group in crash_groups:
        grouped_crashes = group_crashes(crash_details, group)
        for group_key in grouped_crashes:
            metrics.append(
                PrometheusMetric(
                    name="crash_analysis_crash_count",
                    labels=get_prometheus_label_from_key(group_key),
                    value=len(grouped_crashes[group_key]),
                    time=start_time_ms,
                )
            )

    PrometheusClient.write_metrics(metrics=metrics)
    logging.info(f"Published crash_analysis_crash_count metric(s) to Prometheus.")

    # --- Step 5 ---
    # add_crash_detail()
    # async with MySQLClient().lease() as sa_conn:
    #     get_grouped_crashes = (
    #         select([CrashAnalysisResults])
    #         .where(ScanTestParams.schedule_id == schedule_id)
    #         .order_by(ScanTestParams.id.desc())
    #         .limit(1)
    #     )
    #     await sa_conn.execute(get_params_query)
