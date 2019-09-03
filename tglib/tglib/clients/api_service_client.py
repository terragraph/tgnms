#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import copy
from typing import Dict, Optional, Tuple, cast

import aiohttp
import ipaddress
import logging
import pymysql

from tglib.clients.base_client import BaseClient
from tglib.exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)


class APIServiceClient(BaseClient):
    def __init__(self, config: Dict) -> None:
        if "mysql" not in config:
            raise ConfigError("Missing required 'mysql' key")

        if not isinstance(config["mysql"], dict):
            raise ConfigError("Config value for 'mysql' is not object")

        # timeout is for HTTP get/post
        self.timeout = 1

        # Make a deep copy to avoid altering 'config' for other clients
        mysql_params = copy.deepcopy(config["mysql"])
        mysql_params["db"] = "cxl"

        required_params = ["host", "port", "user", "password", "db"]
        if not all(param in mysql_params for param in required_params):
            raise ConfigError(
                f"Missing one or more required 'mysql' params: {required_params}"
            )

        try:
            connection = pymysql.connect(
                cursorclass=pymysql.cursors.DictCursor, **mysql_params
            )

            with connection.cursor() as cursor:
                query = (
                    "SELECT name, api_ip, api_port FROM topology "
                    "JOIN controller ON primary_controller=controller.id"
                )

                cursor.execute(query)
                results = cursor.fetchall()

                self._controllers = {}
                for result in results:
                    try:
                        ip = f"[{ipaddress.IPv6Address(result['api_ip'])}]"
                    except ipaddress.AddressValueError:
                        ip = result["api_ip"]
                    self._controllers[result["name"]] = f"{ip}:{result['api_port']}"

        except pymysql.MySQLError as e:
            raise ClientRuntimeError(self.class_name) from e
        finally:
            connection.close()

        self._session: Optional[aiohttp.ClientSession] = None

    async def start(self) -> None:
        if self._session is not None:
            raise ClientRestartError(self.class_name)

        self._session = aiohttp.ClientSession()

    async def stop(self) -> None:
        if self._session is None:
            raise ClientStoppedError(self.class_name)

        await self._session.close()
        self._session = None

    @property
    async def health(self) -> Tuple[bool, str]:
        if self._session is None:
            raise ClientStoppedError(self.class_name)

        tasks = [
            self.make_api_request(name, "getTopology")
            for name, _ in self._controllers.items()
        ]

        try:
            await asyncio.gather(*tasks)
            return True, self.class_name
        except ClientRuntimeError as e:
            return False, f"{self.class_name}: {str(e)}"

    async def make_api_request(
        self, topology_name: str, endpoint: str, params: Optional[Dict] = {}
    ) -> Dict:
        """Make a request to API service for a given a specific topology, endpoint, and params."""
        if self._session is None:
            raise ClientStoppedError(self.class_name)

        if topology_name not in self._controllers:
            msg = f"{topology_name} does not exist"
            raise ClientRuntimeError(client=self.class_name, msg=msg)

        try:
            url = f"http://{self._controllers[topology_name]}/api/{endpoint}"
            logging.debug(f"Requesting from API service {url}")
            async with self._session.post(
                url, json=params, timeout=self.timeout
            ) as resp:
                if resp.status == 200:
                    return cast(Dict, await resp.json())

                msg = f"API service request to {topology_name} failed: {resp.reason} ({resp.status})"
                raise ClientRuntimeError(client=self.class_name, msg=msg)
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            msg = f"API service for {topology_name} is unavailable"
            raise ClientRuntimeError(client=self.class_name, msg=msg) from e
