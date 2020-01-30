#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
This example shows how to use the tglib 'init' function to create a simple
microservice for consuming messages from the Kafka 'stats' and 'hf_stats'
topics.

The 'async_main' function defines the Kafka consumer business logic. To get a
Kafka consumer object, simply create one using its constructor. A set of clients
(only the KAFKA_CONSUMER variant is needed in this case) are supplied along with
a lambda function wrapping the 'async_main' function to 'init'.
"""

import json
import logging
import sys
from typing import Dict

from tglib import ClientType, init
from tglib.clients import KafkaConsumer


async def async_main(config: Dict) -> None:
    """Get the Kafka consumer client and print messages from the topics list."""
    consumer = KafkaConsumer().consumer
    consumer.subscribe(config["topics"])

    async for msg in consumer:
        logging.info(
            f"{msg.topic}:{msg.partition:d}:{msg.offset:d}: "
            f"key={msg.key} value={msg.value} timestamp_ms={msg.timestamp}"
        )


def main() -> None:
    """Pass in the 'async_main' function and a set of clients into 'init'."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(lambda: async_main(config), {ClientType.KAFKA_CONSUMER})
