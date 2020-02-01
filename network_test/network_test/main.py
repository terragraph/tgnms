#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import json
import logging
import sys
from typing import Dict

from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .routes import routes
from .scheduler import Scheduler


async def async_main(config: Dict) -> None:
    # Reschedule any tests found in the schedule upon startup
    await Scheduler.restart()

    # Poll test result topics for completed sessions
    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        value = json.loads(msg.value.decode("utf-8"))
        logging.debug(value["output"])

        # TODO: (omikader) T57575677 Save results to MySQL
        # TODO: (omikader) T57575686 Fetch FW stats from Prometheus


def main() -> None:
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {
            ClientType.API_SERVICE_CLIENT,
            ClientType.KAFKA_CONSUMER,
            ClientType.MYSQL_CLIENT,
        },
        routes,
    )
