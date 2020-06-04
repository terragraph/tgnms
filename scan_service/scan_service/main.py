#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import sys
from pathlib import Path
from typing import Dict, List
from uuid import uuid4

from terragraph_thrift.Event.ttypes import EventId
from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .connectivity import HardwareConfig, analyze_connectivity
from .data_loader import get_im_data
from .interference import analyze_interference
from .scan import parse_scan_results
from .utils.db import get_scan_groups, write_results, write_scan_response_rate_stats


async def scan_results_handler(
    value: str, scan_results_dir: Path, con: HardwareConfig
) -> None:
    try:
        scan_msg = json.loads(value)
        scan_result = scan_msg["result"]
        network_name = scan_msg["topologyName"]
        token = scan_result["token"]
        logging.info(f"Received scan response token '{token}' for {network_name}")

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
            scan_results={
                "network_name": network_name,
                "scan_result_path": str(filepath),
                **parse_scan_results(scan_result),
            },
            connectivity_results=analyze_connectivity(im_data, network_name, con),
            interference_results=await analyze_interference(im_data, network_name),
        )
    except json.JSONDecodeError:
        logging.exception("Failed to deserialize scan data")
    except KeyError:
        logging.exception("Invalid scan message received from Kafka")


async def events_handler(value: str) -> None:
    try:
        event = json.loads(value)
        event_id = event["eventId"]
        network_name = event["topologyName"]

        # TODO: T64970789: Refactor response_rate calculation logic
        # Temporarily disabled
        if False and event_id == EventId.SCAN_COMPLETE:
            event_details = json.loads(event["details"])
            group_id = event_details["groupId"]
            groups = await get_scan_groups(network_name, group_id)
            resp_rates = [group.calculate_response_rate() for group in groups]
            await write_scan_response_rate_stats(resp_rates)
    except json.JSONDecodeError:
        logging.exception("Failed to deserialize event data")
    except KeyError:
        logging.exception("Invalid event received from Kafka")


async def async_main(config: Dict, scan_results_dir: Path, con: HardwareConfig) -> None:
    """Consume and store scan data, and perform analysis when scans are complete."""
    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        value = msg.value.decode("utf-8")
        if msg.topic == "scan_results":
            await scan_results_handler(value, scan_results_dir, con)
        elif msg.topic == "events":
            await events_handler(value)


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
    )
