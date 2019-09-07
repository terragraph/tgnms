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
    def __init__(self, config: Dict) -> None:
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

        self._mongodb_params: Dict = mongodb_params
        self._motor_client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._db_name: str = self._mongodb_params["db"]
        del self._mongodb_params["db"]

    async def start(self) -> None:
        if self._motor_client is not None:
            raise ClientRestartError()

        self._motor_client = AsyncIOMotorClient(**self._mongodb_params)
        self._db = self._motor_client[self._db_name]

    async def stop(self) -> None:
        self._motor_client = None

    async def health_check(self) -> HealthCheckResult:
        if self._motor_client is None:
            raise ClientStoppedError()

        try:
            server_info = await self._motor_client.server_info()
        except PyMongoError as e:
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

    def get_db(self) -> AsyncIOMotorDatabase:
        """Return the db object to perform db operations."""
        if self._motor_client is None:
            raise ClientStoppedError()

        return self._db

    async def get_session(self) -> AsyncIOMotorClientSession:
        """Return a session to organize atomic db operations."""
        if self._motor_client is None:
            raise ClientStoppedError()

        return await self._motor_client.start_session()
