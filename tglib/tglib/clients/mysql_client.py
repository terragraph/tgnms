#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import os
from typing import Dict, Optional

import aiomysql
from aiomysql.sa import Engine, create_engine

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from .base_client import BaseClient


class MySQLClient(BaseClient):
    _engine: Optional[Engine] = None

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._engine is not None:
            raise ClientRestartError()

        mysql_params = config.get("mysql")
        required_params = ["host", "port"]

        if mysql_params is None:
            raise ConfigError("Missing required 'mysql' key")
        if not isinstance(mysql_params, dict):
            raise ConfigError("Value for 'mysql' is not an object")
        if not all(param in mysql_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        mysql_params.update(
            {
                "db": os.getenv("DB_NAME"),
                "user": os.getenv("DB_USER"),
                "password": os.getenv("DB_PASSWORD"),
            }
        )

        try:
            cls._engine = await create_engine(**mysql_params)
        except aiomysql.OperationalError as e:
            raise ClientRuntimeError() from e

    @classmethod
    async def stop(cls) -> None:
        if cls._engine is None:
            raise ClientStoppedError()

        cls._engine.close()
        await cls._engine.wait_closed()
        cls._engine = None

    def lease(self):
        """Get a connection from the connection pool.

        Use with async context manager to return an aiomysql.sa.SAConnection.
        """
        if self._engine is None:
            raise ClientStoppedError()

        return self._engine.acquire()
