#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import List
from uuid import uuid4

from terragraph_thrift.Event.ttypes import EventId
from tglib import init
from tglib.clients import APIServiceClient, KafkaConsumer, MySQLClient, PrometheusClient

from .analysis.connectivity import analyze_connectivity
from .analysis.interference import analyze_interference
from .models import ScanTestStatus
from .routes import routes
from .scan import parse_scan_results
from .scheduler import Scheduler
from .utils.alerts import Alerts, Severity
from .utils.data_loader import get_im_data
from .utils.db import write_results
from .utils.hardware_config import HardwareConfig
from .utils.topology import Topology


async def scan_results_handler(
    value: str,
    scan_results_dir: Path,
    n_days: int,
    use_real_links: bool,
    min_connectivity_snr: int,
) -> None:
    """Consume scan results, perform analysis, and write to database."""
    try:
        scan_msg = json.loads(value)
        scan_result = scan_msg["result"]
        network_name = scan_msg["topologyName"]
        token = scan_result["token"]
    except json.JSONDecodeError:
        logging.exception("Failed to deserialize scan message.")
        return None
    except KeyError:
        logging.exception("Invalid scan message received from Kafka")
        return None

    logging.info(f"Received scan response token '{token}' for {network_name}")
    execution_info = Scheduler.get_execution(token, network_name)
    if execution_info is None:
        logging.info("The token is not part of a test started by the scan service.")
        return None
    execution_id, _ = execution_info

    # Save scan result to file system
    try:
        filepath = scan_results_dir / f"{uuid4()}.json"
        with filepath.open("w", encoding="utf-8") as f:
            json.dump(scan_result, f)
    except OSError:
        logging.exception("Failed to write scan results to disk.")

    # Prepare to analyze scan results
    im_data = await get_im_data(scan_result["data"], network_name, n_days)

    # Analyze scan results and write all results to the database
    await write_results(
        execution_id,
        network_name,
        token,
        scan_results={"results_path": str(filepath), **parse_scan_results(scan_result)},
        connectivity_results=analyze_connectivity(
            im_data, n_days, target=min_connectivity_snr
        ),
        interference_results=await analyze_interference(
            im_data, network_name, n_days, use_real_links
        ),
        aggregated_rx_responses=(
            im_data["curr_aggregated_responses"] if im_data is not None else None
        ),
    )


async def events_handler(value: str) -> None:
    """Consume scan complete events and mark the execution status as FINISHED."""
    try:
        event = json.loads(value)
        if event["eventId"] != EventId.SCAN_COMPLETE:
            return None
        network_name = event["topologyName"]
        event_details = json.loads(event["details"])
        token = event_details["token"]
    except json.JSONDecodeError:
        logging.exception("Failed to deserialize event data")
        return None
    except KeyError:
        logging.exception("Invalid event received from Kafka")
        return None

    logging.debug(f"Got scan complete event for {network_name}, token {token}")
    execution_info = Scheduler.get_execution(token, network_name)
    if execution_info is None:
        return None
    execution_id, execution = execution_info

    execution.token_range.discard(token)
    if execution.token_range:
        return None

    await Scheduler.update_execution_status(
        execution_id, ScanTestStatus.FINISHED, datetime.utcnow()
    )
    await Alerts.post(
        execution_id,
        f"Scan test for execution id {execution_id} is now complete.",
        Severity.INFO,
    )

    await asyncio.sleep(Scheduler.CLEAN_UP_DELAY_S)
    del Scheduler.executions[execution_id]


async def async_main(
    topics: List[str],
    scan_results_dir: Path,
    n_days: int,
    use_real_links: bool,
    min_connectivity_snr: int,
    enable_alerts: bool,
) -> None:
    """Consume and store scan data, and perform analysis when scans are complete."""

    # Reschedule any tests found in the schedule upon startup,
    # fetch latest topologies for analysis, and
    # initialize alerts
    await asyncio.gather(
        Scheduler.restart(), Topology.update_topologies(), Alerts.init(enable_alerts)
    )

    consumer = KafkaConsumer().consumer
    consumer.subscribe(topics)

    async for msg in consumer:
        value = msg.value.decode("utf-8")
        if msg.topic == "scan_results":
            asyncio.create_task(
                scan_results_handler(
                    value,
                    scan_results_dir,
                    n_days,
                    use_real_links,
                    min_connectivity_snr,
                )
            )
        elif msg.topic == "events":
            asyncio.create_task(events_handler(value))


def main() -> None:
    try:
        with open("./hardware_config.json") as f:
            hardware_config = json.load(f)
        HardwareConfig.set_config(hardware_config)

        with open("./service_config.json") as f:
            config = json.load(f)
        scan_results_dir = Path(config["scan_results_dir"])
        scan_results_dir.mkdir(parents=True, exist_ok=True)

        topics = config["topics"]
        n_days = config["n_days"]
        use_real_links = config["use_real_links"]
        min_connectivity_snr = config["min_connectivity_snr"]
        enable_alerts = config["enable_alerts"]
    except (json.JSONDecodeError, OSError, KeyError):
        logging.exception("Failed to parse configuration file.")
        sys.exit(1)

    init(
        lambda: async_main(
            topics,
            scan_results_dir,
            n_days,
            use_real_links,
            min_connectivity_snr,
            enable_alerts,
        ),
        {APIServiceClient, KafkaConsumer, MySQLClient, PrometheusClient},
        routes,
    )
