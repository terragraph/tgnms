#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
from typing import Any, Dict, Optional

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from .base_client import BaseClient


class KafkaConsumer(BaseClient):
    """A client for consuming records from Kafka."""

    _consumer: Optional[AIOKafkaConsumer] = None

    @classmethod
    async def start(cls, config: Dict[str, Any]) -> None:
        """Initialize the Kafka consumer resource.

        Args:
            config: Params and values for configuring the client.

        Raises:
            ClientRestartError: The Kafka consumer resource has already been initialized.
            ClientRuntimeError: The Kafka consumer resource failed to connect to Kafka.
            ConfigError: The ``config`` argument is incorrect/incomplete.
        """
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
        """Cleanly shutdown the Kafka consumer resource.

        Raises:
            ClientStoppedError: The Kafka consumer resource is not running.
        """
        if cls._consumer is None:
            raise ClientStoppedError()

        await cls._consumer.stop()

    @property
    def consumer(self) -> AIOKafkaConsumer:
        """Return the underlying Kafka consumer resource.

        Raises:
            ClientStoppedError: The Kafka consumer resource is not running.
        """
        if self._consumer is None:
            raise ClientStoppedError()

        return self._consumer
