#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Dict, Optional, Tuple

import pymysql
from aiomysql.sa import Engine, SAConnection, create_engine

from .base_client import BaseClient
from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


class MySQLClient(BaseClient):
    def __init__(self, config: Dict) -> None:
        if "mysql" not in config:
            raise ConfigError("Missing required 'mysql' key")

        mysql_params = config["mysql"]
        if not isinstance(mysql_params, dict):
            raise ConfigError("Config value for 'mysql' is not an object")

        required_params = ["host", "port", "user", "password", "db"]
        if not all(param in mysql_params for param in required_params):
            raise ConfigError(
                f"Missing one or more required 'mysql' params: {required_params}"
            )

        self._mysql_params = mysql_params
        self._engine: Optional[Engine] = None

    async def start(self) -> None:
        if self._engine is not None:
            raise ClientRestartError(self.class_name)

        try:
            self._engine = await create_engine(**self._mysql_params)
        except pymysql.OperationalError as e:
            raise ClientRuntimeError(self.class_name) from e

    async def stop(self) -> None:
        if self._engine is None:
            raise ClientStoppedError(self.class_name)

        self._engine.close()
        await self._engine.wait_closed()
        self._engine = None

    @property
    async def health(self) -> Tuple[bool, str]:
        if self._engine is None:
            raise ClientStoppedError(self.class_name)

        if self._engine.freesize > 0:
            return True, self.class_name
        else:
            return False, f"{self.class_name}: No connections available"

    def lease(self) -> SAConnection:
        """Return a connection from the engine. Use with async context manager."""
        if self._engine is None:
            raise ClientStoppedError(self.class_name)

        return self._engine.acquire()
