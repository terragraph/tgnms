#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
from typing import Dict, Optional

from aiokafka import AIOKafkaConsumer
from kafka.errors import KafkaError

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from .base_client import BaseClient


class KafkaConsumer(BaseClient):
    _consumer: Optional[AIOKafkaConsumer] = None

    @property
    def consumer(self) -> AIOKafkaConsumer:
        """Return the underlying AIOKafkaConsumer instance."""
        if self._consumer is None:
            raise ClientStoppedError()

        return self._consumer

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._consumer is not None:
            raise ClientRestartError()

        kafka_params = config.get("kafka")
        required_params = ["bootstrap_servers"]

        if kafka_params is None:
            raise ConfigError("Missing required 'kafka' key")
        if not isinstance(kafka_params, dict):
            raise ConfigError("Config value for 'kafka' is not object")
        if not all(param in kafka_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        try:
            cls._consumer = AIOKafkaConsumer(
                loop=asyncio.get_event_loop(), **kafka_params
            )
            await cls._consumer.start()
        except KafkaError as e:
            raise ClientRuntimeError() from e

    @classmethod
    async def stop(cls) -> None:
        if cls._consumer is None:
            raise ClientStoppedError()

        await cls._consumer.stop()
