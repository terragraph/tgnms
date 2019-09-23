#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import sys
from typing import Dict

from terragraph_thrift.Event.ttypes import Event, EventId
from tglib.clients.kafka_consumer import KafkaConsumer
from tglib.tglib import Client, init

from scan_service.response_rate_stats import ResponseRateStats
from scan_service.scan_db import ScanDb


async def main(config: Dict) -> None:
    """Get kafka consumer client, and listen for SCAN_COMPLETED events to start analysis"""

    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    scan_db = ScanDb()

    async for msg in consumer:
        event = json.loads(msg.value)
        if event["eventId"] == EventId.SCAN_COMPLETE:
            from_bwgd = await scan_db.get_latest_response_rate_bwgd()
            groups = await scan_db.get_scan_groups(
                from_bwgd=from_bwgd, decompress_scan_resp=False
            )
            resp_rates = [ResponseRateStats(group) for group in groups]
            logging.info(
                "Number of new scan groups analyzed: {}".format(len(resp_rates))
            )

            await scan_db.write_scan_response_rate_stats(resp_rates)


if __name__ == "__main__":
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except OSError:
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(lambda: main(config), {Client.KAFKA_CONSUMER, Client.MYSQL_CLIENT})
