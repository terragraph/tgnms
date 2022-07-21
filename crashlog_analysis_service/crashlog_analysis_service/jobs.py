#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import logging

from dateutil.parser import isoparse
from elasticsearch import AsyncElasticsearch
from typing import Dict, List, Tuple

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric

from .utils.crash_analysis_runner import analyze_log, group_crashes
from .utils.crash_details import CrashDetails
from .utils.crash_key import CrashKey
from .utils.crash_analyzer import LogSource
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
        Tuple[str, str, str], List[str]
    ] = await get_crash_logs_from_elasticsearch(start_time_ms, es_indices, es)

    # --- Step 2 ---
    crash_list: List[CrashDetails] = []
    for (node_name, log_file, timestamp), log in crash_logs.items():
        crash_list.extend(
            analyze_log(
                log_source=LogSource.ELASTICSEARCH,
                log_lines=log,
                log_path=log_file,
                node_id=node_name,
                timestamp=timestamp,
            )
        )

    # --- Step 3 ---
    # await save_crash_details_to_db(crash_list)

    # --- Step 4 ---
    metrics: List[PrometheusMetric] = []
    for crash in crash_list:
        labels = {
            "crash_type": crash.crash_type,
            "application": crash.application,
            "node_id": crash.node_id,
        }
        dt = isoparse(crash.crash_time)
        crash_time_ms = int(dt.timestamp() * 1000)
        logging.info(
            f"Found crash! {crash.node_id}/{crash.application} "
            f"crashed due to {crash.crash_type} at {crash_time_ms}"
        )

        metrics.append(
            PrometheusMetric(
                name="crash_analysis_crash_count",
                labels=labels,
                value=1,
                time=crash_time_ms,
            )
        )

    PrometheusClient.write_metrics(metrics=metrics)
    logging.info(
        f"Published {len(crash_list)} crash_analysis_crash_count(s)" + " to Prometheus."
    )

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
