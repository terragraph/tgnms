#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
from typing import Any, Dict

from tglib import init
from tglib.clients import APIServiceClient, KafkaConsumer, MySQLClient, PrometheusClient

from .routes import routes
from .scheduler import Scheduler


async def async_main(config: Dict[str, Any]) -> None:
    # Reschedule any tests found in the schedule upon startup
    if "processing_timeout_s" in config:
        Scheduler.timeout = config["processing_timeout_s"]
    await Scheduler.restart()

    # Poll test result topics for completed sessions
    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        asyncio.create_task(Scheduler.process_msg(msg.value.decode("utf-8")))


def main() -> None:
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {APIServiceClient, KafkaConsumer, MySQLClient, PrometheusClient},
        routes,
    )
