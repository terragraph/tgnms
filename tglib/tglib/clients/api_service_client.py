#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
from typing import Dict, List, Optional, cast

import aiohttp

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from ..utils.ip import format_address
from .base_client import BaseClient, HealthCheckResult


class APIServiceClient(BaseClient):
    _networks: Optional[Dict[str, str]] = None
    _session: Optional[aiohttp.ClientSession] = None

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout

    @classmethod
    async def start(cls, config: Dict) -> None:
        if cls._session is not None:
            raise ClientRestartError()

        api_params = config.get("apiservice")
        required_params = ["nms"]

        if api_params is None:
            raise ConfigError("Missing required 'apiservice' key")
        if not isinstance(api_params, dict):
            raise ConfigError("Value for 'apiservice' is not an object")
        if not all(param in api_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        addr = format_address(**api_params["nms"])
        url = f"http://{addr}/api/v1/networks"
        cls._session = aiohttp.ClientSession()

        try:
            async with cls._session.get(url, timeout=1) as resp:
                if resp.status != 200:
                    raise ClientRuntimeError(msg=f"{resp.reason} ({resp.status})")

                cls._networks = {
                    network["name"]: format_address(
                        network["primary"]["api_ip"], network["primary"]["api_port"]
                    )
                    for network in await resp.json()
                }
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"{url} is unavailable") from e

    @classmethod
    async def stop(cls) -> None:
        if cls._session is None:
            raise ClientStoppedError()

        await cls._session.close()
        cls._session = None

    @classmethod
    async def health_check(cls) -> HealthCheckResult:
        # Use 'getTopology' endpoint to test if API service is alive
        async def get_topology(addr: str) -> bool:
            if cls._session is None:
                raise ClientStoppedError()

            url = f"http://{addr}/api/getTopology"
            try:
                async with cls._session.post(url, timeout=1) as resp:
                    if resp.status == 200:
                        return True

                    return False
            except (aiohttp.ClientError, asyncio.TimeoutError):
                return False

        if cls._networks is None:
            raise ClientStoppedError()

        tasks = [get_topology(addr) for addr in cls._networks.values()]
        if any(await asyncio.gather(*tasks)):
            return HealthCheckResult(client=cls.__name__, healthy=True)
        else:
            return HealthCheckResult(
                client=cls.__name__, healthy=False, msg="All clients are unavailable"
            )

    @property
    def names(self) -> List[str]:
        if self._networks is None:
            raise ClientStoppedError()

        return list(self._networks.keys())

    async def request(self, name: str, endpoint: str, params: Dict = {}) -> Dict:
        """Make a request to a specific addr, endpoint, and params."""
        if self._networks is None or self._session is None:
            raise ClientStoppedError()

        addr = self._networks.get(name)
        if addr is None:
            raise ClientRuntimeError(msg=f"{name} does not exist")

        url = f"http://{addr}/api/{endpoint}"
        logging.debug(f"Requesting from {url} with params {params}")

        try:
            async with self._session.post(
                url, json=params, timeout=self.timeout
            ) as resp:
                if resp.status == 200:
                    return cast(Dict, await resp.json())

                raise ClientRuntimeError(
                    msg=f"API Service request failed {resp.reason} ({resp.status})"
                )
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"API Service at {addr} is unavailable") from e

    async def request_all(
        self,
        endpoint: str,
        params_map: Dict[str, Dict] = {},
        return_exceptions: bool = False,
    ) -> Dict[str, Dict]:
        """Make a request to the given endpoint for all networks.

        params_map is a dictionary of network names to params. The default post
        param '{}' is used for networks not present in params_map.

        return_exceptions is a boolean flag for returning exceptions as objects
        instead of raising the first one. It is disabled by default."""
        if self._networks is None:
            raise ClientStoppedError()

        tasks = []
        for name in self._networks.keys():
            if name in params_map:
                tasks.append(self.request(name, endpoint, params_map[name]))
            else:
                tasks.append(self.request(name, endpoint))

        return dict(
            zip(
                self._networks.keys(),
                await asyncio.gather(*tasks, return_exceptions=return_exceptions),
            )
        )

    async def request_many(
        self,
        endpoint: str,
        params_map: Dict[str, Dict],
        return_exceptions: bool = False,
    ) -> Dict[str, Dict]:
        """Make a request to the given endpoint for several networks.

        params_map is a dictionary of network names to params. No request is
        sent for networks not present in params_map.

        return_exceptions is a boolean flag for returning exceptions as objects
        instead of raising the first one. It is disabled by default."""
        if self._networks is None:
            raise ClientStoppedError()

        tasks = []
        for name, params in params_map.items():
            if name not in self._networks:
                continue

            tasks.append(self.request(name, endpoint, params))

        return dict(
            zip(
                params_map.keys(),
                await asyncio.gather(*tasks, return_exceptions=return_exceptions),
            )
        )
