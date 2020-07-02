#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Dict, List
from uuid import uuid4
from datetime import datetime
from terragraph_thrift.Event.ttypes import EventId
from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .analysis.connectivity import analyze_connectivity
from .analysis.interference import analyze_interference
from .models import ScanTestStatus
from .routes import routes
from .scan import parse_scan_results
from .scheduler import Scheduler
from .utils.data_loader import get_im_data
from .utils.db import write_results
from .utils.hardware_config import HardwareConfig


async def scan_results_handler(
    value: str, scan_results_dir: Path, con: HardwareConfig
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
    im_data = get_im_data(scan_result["data"])

    # Analyze scan results and write all results to the database
    await write_results(
        execution_id,
        network_name,
        token,
        scan_results={"results_path": str(filepath), **parse_scan_results(scan_result)},
        connectivity_results=analyze_connectivity(im_data, con),
        interference_results=await analyze_interference(im_data, network_name),
    )


async def events_handler(value: str) -> None:
    """Consume scan complete events and mark the execution status as FINISHED."""
    try:
        event = json.loads(value)
        network_name = event["topologyName"]
        event_id = event["eventId"]
        if event_id != EventId.SCAN_COMPLETE:
            return None

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
    await asyncio.sleep(Scheduler.CLEAN_UP_DELAY_S)
    del Scheduler.executions[execution_id]


async def async_main(config: Dict, scan_results_dir: Path, con: HardwareConfig) -> None:
    """Consume and store scan data, and perform analysis when scans are complete."""
    # Reschedule any tests found in the schedule upon startup
    await Scheduler.restart()

    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        value = msg.value.decode("utf-8")
        if msg.topic == "scan_results":
            asyncio.create_task(scan_results_handler(value, scan_results_dir, con))
        elif msg.topic == "events":
            asyncio.create_task(events_handler(value))


def main() -> None:
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
        scan_results_dir = Path(config["scan_results_dir"])
        scan_results_dir.mkdir(parents=True, exist_ok=True)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    # Configure hardware specific config params
    beam_order: List[int] = []
    for start, end, interval in config["hardware_config"]["beam_order_range"]:
        beam_order += list(range(start, end, interval))
    con = HardwareConfig(beam_order, **config["hardware_config"]["constants"])

    init(
        lambda: async_main(config, scan_results_dir, con),
        {
            ClientType.API_SERVICE_CLIENT,
            ClientType.KAFKA_CONSUMER,
            ClientType.MYSQL_CLIENT,
            ClientType.PROMETHEUS_CLIENT,
        },
        routes,
    )
