#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional, cast

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError
from terragraph_thrift.Event.ttypes import Event, EventCategory, EventId, EventLevel

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from ..utils.thrift import Thrift, thrift2json
from .base_client import BaseClient


class KafkaProducer(BaseClient):
    """A client for producing records to Kafka."""

    _producer: Optional[AIOKafkaProducer] = None

    @classmethod
    async def start(cls, config: Dict[str, Any]) -> None:
        """Initialize the Kafka producer resource.

        Args:
            config: Params and values for configuring the client.

        Raises:
            ClientRestartError: The Kafka producer resource has already been initialized.
            ClientRuntimeError: The Kafka producer resource failed to connect to Kafka.
            ConfigError: The ``config`` argument is incorrect/incomplete.
        """
        if cls._producer is not None:
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
            cls._producer = AIOKafkaProducer(
                loop=asyncio.get_event_loop(), **kafka_params
            )
            await cls._producer.start()
        except KafkaError as e:
            raise ClientRuntimeError() from e

    @classmethod
    async def stop(cls) -> None:
        """Cleanly shutdown the Kafka producer resource.

        Raises:
            ClientStoppedError: The Kafka producer resource is not running.
        """
        if cls._producer is None:
            raise ClientStoppedError()

        await cls._producer.stop()

    @classmethod
    async def healthcheck(cls) -> bool:
        """Check if the broker is available.

        Returns:
            True if a connection to the broker can be created/attained, False otherwise.
        """
        if cls._producer is None:
            return False

        try:
            node_id = cls._producer.client.get_random_node()
            return cast(bool, await cls._producer.client.ready(node_id))
        except KafkaError:
            return False

    async def send_data(self, topic: str, data: bytes) -> bool:
        """Log a record to the specified ``topic``.

        Args:
            topic: The topic name.
            data: The record value.

        Returns:
            ``True`` if successful, ``False`` otherwise.

        Raises:
            ClientStoppedError: The Kafka producer resource is not running.
        """
        if self._producer is None:
            raise ClientStoppedError()

        try:
            await self._producer.send(topic, data)
            return True
        except KafkaError:
            logging.exception("Failed to schedule record")
            return False

    async def log_event(
        self,
        source: str,
        reason: str,
        category: int,
        level: int,
        event_id: int,
        details: Optional[str] = None,
        entity: Optional[str] = None,
        node_id: Optional[str] = None,
        topology_name: Optional[str] = None,
        node_name: Optional[str] = None,
    ) -> bool:
        """Log an event to the Kafka events topic.

        Args:
            source: The source program (ZMQ identity, process name, etc.).
            reason: The event description, in plain English.
            category: The event category.
            level: The event level.
            event_id: The event ID, for directly associated events.
            details: Supplemental information, as a JSON string.
            entity: The entity this event is associated with.
            node_id: The associated node ID (MAC).
            topology_name: The topology name.
            node_name: The associated node name (if applicable).

        Returns:
            ``True`` if successful, ``False`` otherwise.

        Raises:
            ClientStoppedError: The Kafka producer resource is not running.
        """
        if category not in EventCategory._VALUES_TO_NAMES:
            logging.error(f"Invalid EventCategory: {category}")
            return False
        if event_id not in EventId._VALUES_TO_NAMES:
            logging.error(f"Invalid EventId: {event_id}")
            return False
        if level not in EventLevel._VALUES_TO_NAMES:
            logging.error(f"Invalid EventLevel: {level}")
            return False

        logging.info(
            f"Event {EventCategory._VALUES_TO_NAMES[category]}:{EventId._VALUES_TO_NAMES[event_id]} "
            f"{EventLevel._VALUES_TO_NAMES[level]} => {reason}"
        )

        event = Event()
        event.source = source
        event.timestamp = int(round(time.time()))
        event.reason = reason
        event.category = category
        event.level = level
        event.eventId = event_id
        event.details = details
        event.entity = entity
        event.nodeId = node_id
        event.topologyName = topology_name
        event.nodeName = node_name
        return await self.send_data("events", thrift2json(event))

    async def log_event_dict(
        self,
        source: str,
        reason: str,
        details: Dict,
        category: int,
        level: int,
        event_id: int,
        entity: Optional[str] = None,
        node_id: Optional[str] = None,
        topology_name: Optional[str] = None,
        node_name: Optional[str] = None,
    ) -> bool:
        """Log an event to the Kafka events topic with details in Python dictionary form.

        Args:
            source: The source program (ZMQ identity, process name, etc.).
            reason: The event description, in plain English.
            details: Supplemental information, as a Python dictionary.
            category: The event category.
            level: The event level.
            event_id: The event ID, for directly associated events.
            entity: The entity this event is associated with.
            node_id: The associated node ID (MAC).
            topology_name: The topology name.
            node_name: The associated node name (if applicable).

        Returns:
            ``True`` if successful, ``False`` otherwise.

        Raises:
            ClientStoppedError: The Kafka producer resource is not running.
        """
        return await self.log_event(
            source,
            reason,
            category,
            level,
            event_id,
            json.dumps(details),
            entity,
            node_id,
            topology_name,
            node_name,
        )

    async def log_event_thrift(
        self,
        source: str,
        reason: str,
        details: Thrift,
        category: int,
        level: int,
        event_id: int,
        entity: Optional[str] = None,
        node_id: Optional[str] = None,
        topology_name: Optional[str] = None,
        node_name: Optional[str] = None,
    ) -> bool:
        """Log an event to the Kafka events topic with details in Thrift form.

        Args:
            source: The source program (ZMQ identity, process name, etc.).
            reason: The event description, in plain English.
            details: Supplemental information, as a Thrift object.
            category: The event category.
            level: The event level.
            event_id: The event ID, for directly associated events.
            entity: The entity this event is associated with.
            node_id: The associated node ID (MAC).
            topology_name: The topology name.
            node_name: The associated node name (if applicable).

        Returns:
            ``True`` if successful, ``False`` otherwise.

        Raises:
            ClientStoppedError: The Kafka producer resource is not running.
        """
        return await self.log_event(
            source,
            reason,
            category,
            level,
            event_id,
            thrift2json(details).decode(),
            entity,
            node_id,
            topology_name,
            node_name,
        )
