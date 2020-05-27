#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import os
import sys
from typing import Dict, List

from terragraph_thrift.Event.ttypes import EventId
from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .connectivity import HardwareConfig, analyze_connectivity
from .data_loader import get_im_data
from .interference import analyze_interference
from .utils.db import (
    get_scan_groups,
    write_connectivity_results,
    write_interference_results,
    write_scan_data,
    write_scan_response_rate_stats,
)
from .utils.stats import create_link_mac_map


async def scan_results_handler(
    scan_data_dir: str, msg: str, con: HardwareConfig
) -> None:
    try:
        scan_msg = json.loads(msg)
        scan_result = scan_msg["result"]
        network_name = scan_msg["topologyName"]
        token = scan_result["token"]
        logging.info(f"Received scan response token '{token}' for {network_name}")
        await write_scan_data(scan_data_dir, network_name, scan_result)

        data_im = get_im_data(scan_result["data"])
        if data_im is not None:
            # Analyze connectivity from scan results
            connectivity_results = analyze_connectivity(data_im, network_name, con)
            if connectivity_results:
                logging.info(
                    f"Writing connectivity results for network_name: {network_name}, "
                    f"token: {token}"
                )
                await write_connectivity_results(connectivity_results)
            # analyze interference from scan results
            link_mac_map = await create_link_mac_map(network_name)
            if link_mac_map is not None:
                interference_results = await analyze_interference(
                    data_im, network_name, link_mac_map
                )
                if interference_results:
                    logging.info(
                        "Writing interference results for network_name: "
                        f"{network_name}, token: {token}"
                    )
                    await write_interference_results(interference_results)

    except json.JSONDecodeError:
        logging.exception("Failed to deserialize scan data")
    except KeyError:
        logging.exception("Invalid scan message received from Kafka")


async def events_handler(msg: str) -> None:
    try:
        event = json.loads(msg)
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


async def async_main(config: Dict, scan_data_dir: str) -> None:
    """Consume and store scan data, and perform analysis when scans are complete."""

    # Configure connectivity analysis constants
    beam_order: List[int] = []
    for start, end, interval in config["hardware_config"]["beam_order_range"]:
        beam_order += list(range(start, end, interval))
    con = HardwareConfig(beam_order, **config["hardware_config"]["constants"])

    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        if msg.topic == "scan_results":
            await scan_results_handler(scan_data_dir, msg.value.decode("utf-8"), con)
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
        {
            ClientType.API_SERVICE_CLIENT,
            ClientType.KAFKA_CONSUMER,
            ClientType.MYSQL_CLIENT,
            ClientType.PROMETHEUS_CLIENT,
        },
    )
