#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import os
import sys
from typing import Any, Dict

from terragraph_thrift.Event.ttypes import EventId
from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .utils.db import get_scan_groups, write_scan_data, write_scan_response_rate_stats


async def scan_results_handler(scan_data_dir: str, msg: str) -> None:
    try:
        scan_msg = json.loads(msg)
        scan_result = scan_msg["result"]
        network_name = scan_msg["topologyName"]
        await write_scan_data(scan_data_dir, network_name, scan_result)
    except json.JSONDecodeError:
        logging.exception("Failed to deserialize scan data")
    except KeyError:
        logging.exception("Invalid scan message received from Kafka")


async def events_handler(msg: str) -> None:
    try:
        event = json.loads(msg)
        event_id = event["eventId"]
        network_name = event["topologyName"]

        # TODO: T62134320 to trigger scan response analysis at optimal times
        if event_id == EventId.SCAN_COMPLETE:
            event_details = json.loads(event["details"])
            group_id = event_details["groupId"]
            groups = await get_scan_groups(network_name, group_id)
            resp_rates = [group.calculate_response_rate() for group in groups]
            await write_scan_response_rate_stats(resp_rates)

    except json.JSONDecodeError:
        logging.exception("Failed to deserialize event data")
    except KeyError:
        logging.exception("Invalid event received from Kafka")


async def async_main(config: Dict, scan_data_dir: str) -> None:
    """Consume and store scan data, and perform analysis when scans are complete."""

    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        if msg.topic == "scan_results":
            await scan_results_handler(scan_data_dir, msg.value.decode("utf-8"))
        elif msg.topic == "events":
            await events_handler(msg.value.decode("utf-8"))


def main() -> None:
    try:
        with open("./service_config.json") as f:
            config = json.load(f)

        scan_data_dir = config["scan_data_dir"]
        if not scan_data_dir.endswith("/"):
            scan_data_dir += "/"

        os.makedirs(scan_data_dir)
    except FileExistsError:
        pass
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config, scan_data_dir),
        {ClientType.KAFKA_CONSUMER, ClientType.MYSQL_CLIENT},
    )
