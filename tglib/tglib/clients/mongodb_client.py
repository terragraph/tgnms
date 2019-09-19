#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

from typing import Dict, Optional

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorClientSession,
    AsyncIOMotorDatabase,
)
from pymongo.errors import PyMongoError

from tglib.clients.base_client import BaseClient, HealthCheckResult
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


class MongoDBClient(BaseClient):
    _motor_client: Optional[AsyncIOMotorClient] = None
    _db: Optional[AsyncIOMotorDatabase] = None
    _session: Optional[AsyncIOMotorClientSession] = None

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._motor_client is not None:
            raise ClientRestartError()

        if "mongodb" not in config:
            raise ConfigError("Missing required 'mongodb' key")

        mongodb_params = config["mongodb"]
        if not isinstance(mongodb_params, dict):
            raise ConfigError("Config value for 'mongodb' is not an object")

        required_params = ["host", "port", "db"]
        if not all(param in mongodb_params for param in required_params):
            raise ConfigError(
                f"Missing one or more required 'mongodb' params: {required_params}"
            )

        db_name = mongodb_params.pop("db")

        try:
            cls._motor_client = AsyncIOMotorClient(**mongodb_params)
            cls._db = cls._motor_client[db_name]
        except PyMongoError as e:
            raise ClientRuntimeError("Failed to create MongoDB client") from e

    @classmethod
    async def stop(cls) -> None:
        if cls._session is not None:
            await cls._session.close_session()
        cls._motor_client = None

    @classmethod
    async def health_check(cls) -> HealthCheckResult:
        if cls._motor_client is None:
            raise ClientStoppedError()

        try:
            server_info = await cls._motor_client.server_info()
        except PyMongoError:
            return HealthCheckResult(
                client="MongoDBClient",
                healthy=False,
                msg="Could not fetch MongoDB server info",
            )

        if "version" in server_info:
            return HealthCheckResult(client="MongoDBClient", healthy=True)
        else:
            return HealthCheckResult(
                client="MongoDBClient",
                healthy=False,
                msg="MongoDB server info is malformed",
            )

    @property
    def db(self) -> AsyncIOMotorDatabase:
        """Return the db object to perform db operations."""
        if self._motor_client is None:
            raise ClientStoppedError()

        return self._db

    @property
    async def session(self) -> AsyncIOMotorClientSession:
        """Return a session to organize atomic db operations."""
        if self._motor_client is None:
            raise ClientStoppedError()

        if self._session is None:
            self._session = await self._motor_client.start_session()

        return self._session
