#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
from typing import Any, Dict, Optional, cast

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

    @classmethod
    async def healthcheck(cls) -> bool:
        """Check if the broker is available.

        Returns:
            True if a connection to the broker can be created/attained, False otherwise.
        """
        if cls._consumer is None:
            return False

        try:
            node_id = cls._consumer._client.get_random_node()
            return cast(bool, await cls._consumer._client.ready(node_id))
        except KafkaError:
            return False

    @property
    def consumer(self) -> AIOKafkaConsumer:
        """Return the underlying Kafka consumer resource.

        Raises:
            ClientStoppedError: The Kafka consumer resource is not running.
        """
        if self._consumer is None:
            raise ClientStoppedError()

        return self._consumer
