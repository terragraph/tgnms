#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
from typing import Dict, Tuple

from aiokafka import AIOKafkaConsumer
from kafka.errors import KafkaError

from tglib.clients.base_client import BaseClient
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


class KafkaConsumer(BaseClient, AIOKafkaConsumer):
    def __init__(self, config: Dict) -> None:
        if "kafka" not in config:
            raise ConfigError("Missing required 'kafka' key")

        kafka_params = config["kafka"]
        if not isinstance(kafka_params, dict):
            raise ConfigError("Config value for 'kafka' is not object")

        required_params = ["bootstrap_servers"]
        if not all(param in kafka_params for param in required_params):
            raise ConfigError(
                f"Missing one or more required 'kafka' params: {required_params}"
            )

        try:
            super().__init__(loop=asyncio.get_event_loop(), **kafka_params)
        except KafkaError as e:
            raise ConfigError("'kafka' params are malformed") from e

        self._started = False

    async def start(self) -> None:
        if self._started:
            raise ClientRestartError(self.class_name)

        self._started = True
        try:
            await AIOKafkaConsumer.start(self)
        except KafkaError as e:
            raise ClientRuntimeError(self.class_name) from e

    async def stop(self) -> None:
        if not self._started:
            raise ClientStoppedError(self.class_name)

        self._started = False
        try:
            await AIOKafkaConsumer.stop(self)
        except KafkaError as e:
            raise ClientRuntimeError(self.class_name) from e

    @property
    async def health(self) -> Tuple[bool, str]:
        if not self._started:
            raise ClientStoppedError(self.class_name)

        try:
            await self.topics()
            return True, self.class_name
        except KafkaError:
            return False, f"{self.class_name}: Could not fetch topics list"
