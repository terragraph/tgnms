#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from typing import Dict

from tglib import ClientType, init
from tglib.clients import KafkaConsumer

from .processing import process_msg
from .routes import routes
from .scheduler import Scheduler


async def async_main(config: Dict) -> None:
    # Reschedule any tests found in the schedule upon startup
    if "execution_timeout_s" in config:
        Scheduler.timeout = config["execution_timeout_s"]
    await Scheduler.restart()

    # Poll test result topics for completed sessions
    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        asyncio.create_task(process_msg(msg.value.decode("utf-8")))


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
            ClientType.PROMETHEUS_CLIENT,
        },
        routes,
    )
