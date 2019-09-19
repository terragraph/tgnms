#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, Optional

import pymysql
from aiomysql.sa import Engine, create_engine

from tglib.clients.base_client import BaseClient, HealthCheckResult
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


class MySQLClient(BaseClient):
    _engine: Optional[Engine] = None

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._engine is not None:
            raise ClientRestartError()

        mysql_params = config.get("mysql")
        required_params = ["host", "port", "user", "password", "db"]

        if mysql_params is None:
            raise ConfigError("Missing required 'mysql' key")
        if not isinstance(mysql_params, dict):
            raise ConfigError("Value for 'mysql' is not an object")
        if not all(param in mysql_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        try:
            cls._engine = await create_engine(**mysql_params)
        except pymysql.OperationalError as e:
            raise ClientRuntimeError() from e

    @classmethod
    async def stop(cls) -> None:
        if cls._engine is None:
            raise ClientStoppedError()

        cls._engine.close()
        await cls._engine.wait_closed()
        cls._engine = None

    @classmethod
    async def health_check(cls) -> HealthCheckResult:
        if cls._engine is None:
            raise ClientStoppedError()

        if cls._engine.freesize > 0:
            return HealthCheckResult(client=cls.__name__, healthy=True)
        else:
            return HealthCheckResult(
                client=cls.__name__, healthy=False, msg="No connections available"
            )

    def lease(self):
        """Get a connection from the connection pool.

        Returns an 'SAConnection' when used with an async context manager."""
        if self._engine is None:
            raise ClientStoppedError()

        return self._engine.acquire()
