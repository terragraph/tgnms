#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import time
from typing import Dict, Optional

from aiokafka import AIOKafkaProducer
from kafka.errors import KafkaError
from terragraph_thrift.Event.ttypes import Event, EventCategory, EventId, EventLevel

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from ..utils.serialization import thrift2json
from .base_client import BaseClient, HealthCheckResult


class KafkaProducer(BaseClient):
    _producer: Optional[AIOKafkaProducer] = None

    @classmethod
    async def start(cls, config: Dict) -> None:
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
        if cls._producer is None:
            raise ClientStoppedError()

        await cls._producer.stop()

    @classmethod
    async def health_check(cls) -> HealthCheckResult:
        if cls._producer is None:
            raise ClientStoppedError()

        try:
            # This is a hack -- need a better way to assess connection health
            await cls._producer.partitions_for("stats")
            return HealthCheckResult(client=cls.__name__, healthy=True)
        except KafkaError:
            return HealthCheckResult(
                client=cls.__name__,
                healthy=False,
                msg="Could not fetch 'stats' partitions",
            )

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
        if self._producer is None:
            raise ClientStoppedError()

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

        bytes = thrift2json(event)
        await self._producer.send("events", bytes)
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
            thrift2json(details).decode(),
            entity,
            node_id,
            topology_name,
            node_name,
        )
