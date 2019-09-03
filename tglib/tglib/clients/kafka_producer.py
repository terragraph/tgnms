#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import time
from typing import Dict, Optional, Tuple

from aiokafka import AIOKafkaProducer
from kafka.errors import KafkaError

from tgif.terragraph_thrift.Event.ttypes import (
    Event,
    EventCategory,
    EventId,
    EventLevel,
)
from tglib.clients.base_client import BaseClient
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from tglib.utils.serialization import thrift2bytes, thrift2json


class KafkaProducer(BaseClient, AIOKafkaProducer):
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
            await AIOKafkaProducer.start(self)
        except KafkaError as e:
            raise ClientRuntimeError(self.class_name) from e

    async def stop(self) -> None:
        if not self._started:
            raise ClientStoppedError(self.class_name)

        self._started = False
        try:
            await AIOKafkaProducer.stop(self)
        except KafkaError as e:
            raise ClientRuntimeError(self.class_name) from e

    @property
    async def health(self) -> Tuple[bool, str]:
        if not self._started:
            raise ClientStoppedError(self.class_name)

        try:
            # This is a hack -- need a better way to assess connection health
            await self.partitions_for("stats")
            return True, self.class_name
        except KafkaError:
            return False, f"{self.class_name}: Could not fetch 'stats' partitions"

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
        """Log an event to the Kafka events topic."""
        if not self._started:
            raise ClientStoppedError(self.class_name)

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
            "Event {}:{} {} => {}".format(
                EventCategory._VALUES_TO_NAMES[category],
                EventId._VALUES_TO_NAMES[event_id],
                EventLevel._VALUES_TO_NAMES[level],
                reason,
            )
        )

        event = Event()
        event.source = source
        event.timestamp = int(time.time())
        event.reason = reason
        event.category = category
        event.level = level
        event.eventId = event_id
        event.details = details
        event.entity = entity
        event.nodeId = node_id
        event.topologyName = topology_name
        event.nodeName = node_name

        bytes = thrift2bytes(event)
        await self.send("events", bytes)
        return True

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
        """Log an event to the Kafka events topic with details in Dict form."""
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
        details,
        category: int,
        level: int,
        event_id: int,
        entity: Optional[str] = None,
        node_id: Optional[str] = None,
        topology_name: Optional[str] = None,
        node_name: Optional[str] = None,
    ) -> bool:
        """Log an event to the Kafka events topic with details in thrift form."""
        return await self.log_event(
            source,
            reason,
            category,
            level,
            event_id,
            thrift2json(details),
            entity,
            node_id,
            topology_name,
            node_name,
        )
