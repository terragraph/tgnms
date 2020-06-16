#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import os
import time
from typing import Any, Collection, Dict, Optional, cast

import aiohttp

from ..exceptions import (
    ClientRestartError,
    ClientRuntimeError,
    ClientStoppedError,
    ConfigError,
)
from ..utils.ip import format_address
from .base_client import BaseClient


class APIServiceClient(BaseClient):
    """A client for communicating with the Terragraph API service.

    The client automatically handles refreshing the JSON web token if Keycloak
    is enabled in the network.

    Args:
        timeout: The request timeout, in seconds.
    """

    _networks: Optional[Dict[str, str]] = None
    _session: Optional[aiohttp.ClientSession] = None
    # Needed for Keycloak
    _lock: asyncio.Lock = asyncio.Lock()
    _jwt: Dict = {}
    _refresh_time: Optional[float] = None
    _keycloak_enabled: bool = False
    _keycloak_host: str = os.getenv("KEYCLOAK_HOST") or "http://keycloak_keycloak:8080"
    _keycloak_realm: str = os.getenv("KEYCLOAK_REALM") or "tgnms"
    _keycloak_client_id: Optional[str] = os.getenv("KEYCLOAK_CLIENT_ID")
    _keycloak_client_secret: Optional[str] = os.getenv("KEYCLOAK_CLIENT_SECRET")

    def __init__(self, timeout: int) -> None:
        self.timeout = timeout

    @classmethod
    async def start(cls, config: Dict[str, Any]) -> None:
        """Initialize the underlying HTTP client session pool.

        Args:
            config: Params and values for configuring the client.

        Raises:
            ClientRestartError: The HTTP client session pool has already been initialized.
            ClientRuntimeError: Failed to fetch the network information from the NMS.
            ConfigError: The ``config`` argument is incorrect/incomplete.
        """
        if cls._session is not None:
            raise ClientRestartError()

        api_params = config.get("apiservice")
        required_params = ["keycloak_enabled", "nms"]

        if api_params is None:
            raise ConfigError("Missing required 'apiservice' key")
        if not isinstance(api_params, dict):
            raise ConfigError("Value for 'apiservice' is not an object")
        if not all(param in api_params for param in required_params):
            raise ConfigError(f"Missing one or more required params: {required_params}")

        cls._keycloak_enabled = api_params["keycloak_enabled"]
        cls._session = aiohttp.ClientSession()

        headers: Optional[Dict] = None
        if cls._keycloak_enabled and await cls._refresh_token():
            headers = {"Authorization": f"Bearer {cls._jwt['access_token']}"}

        try:
            url = f"http://{format_address(**api_params['nms'])}/api/v1/networks"
            logging.debug(f"Requesting network information from {url}")

            async with cls._session.get(url, timeout=1, headers=headers) as resp:
                if resp.status != 200:
                    raise ClientRuntimeError(
                        msg=f"NMS request to {url} failed: {resp.reason} ({resp.status})"
                    )

                cls._networks = {
                    network["name"]: format_address(
                        network["primary"]["api_ip"], network["primary"]["api_port"]
                    )
                    for network in await resp.json()
                }
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"NMS request to {url} failed") from e

    @classmethod
    async def stop(cls) -> None:
        """Cleanly shut down the HTTP client session pool.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
        """
        if cls._session is None:
            raise ClientStoppedError()

        await cls._session.close()
        cls._session = None

    @classmethod
    def network_names(cls) -> Collection[str]:
        """Return a collection of the network names managed by the NMS.

        Returns:
            A collection of valid network names managed by the NMS.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
        """
        if cls._networks is None:
            raise ClientStoppedError()

        return cls._networks.keys()

    async def request(
        self, network_name: str, endpoint: str, params: Dict = {}
    ) -> Dict:
        """Make an API request to a specific network + endpoint with params.

        Args:
            network_name: The receiving network of the request.
            endpoint: The API endpoint to invoke (e.g. ``getTopology``).
            params: The POST params to use in the request.

        Returns:
            The JSON response as a Python dictionary.

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: The request failed, timed out, or did not return ``200``.
        """
        if self._networks is None or self._session is None:
            raise ClientStoppedError()

        addr = self._networks.get(network_name)
        if addr is None:
            raise ClientRuntimeError(msg=f"{network_name} does not exist")

        headers: Optional[Dict] = None
        if self._keycloak_enabled:
            async with self._lock:
                if (
                    time.time() > (self._refresh_time + self._jwt["expires_in"])
                    and await self._refresh_token()
                ):
                    headers = {"Authorization": f"Bearer {self._jwt['access_token']}"}

        try:
            url = f"http://{addr}/api/{endpoint}"
            logging.debug(f"Requesting from {url} with params {params}")

            async with self._session.post(
                url, json=params, timeout=self.timeout, headers=headers
            ) as resp:
                if resp.status == 200:
                    return cast(Dict, await resp.json())

                raise ClientRuntimeError(
                    msg=f"API Service request to {url} failed: {resp.reason} ({resp.status})"
                )
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg=f"API Service request to {url} failed") from e

    async def request_all(
        self,
        endpoint: str,
        params_map: Dict[str, Dict] = {},
        return_exceptions: bool = False,
    ) -> Dict[str, Dict]:
        """Make a request to the given endpoint for all networks in the NMS.

        Args:
            endpoint: The API endpoint to invoke (e.g. ``getTopology``).
            params_map: Dictionary of network names to request parameters.
            return_exceptions: Flag to return exceptions as objects instead of raising.

        Returns:
            A dictionary of network names to JSON responses (as Python dictionaries).

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: One of the requests failed and ``return_exceptions`` is ``False``.

        Note:
            The default POST param ``{}`` is used for all network names not present in ``params_map``.
        """
        if self._networks is None:
            raise ClientStoppedError()

        tasks = []
        for network_name in self.network_names():
            params = params_map.get(network_name)
            if params is None:
                tasks.append(self.request(network_name, endpoint))
            else:
                tasks.append(self.request(network_name, endpoint, params))

        return dict(
            zip(
                self.network_names(),
                await asyncio.gather(*tasks, return_exceptions=return_exceptions),
            )
        )

    async def request_many(
        self,
        endpoint: str,
        params_map: Dict[str, Dict],
        return_exceptions: bool = False,
    ) -> Dict[str, Dict]:
        """Make a request to the given endpoint for the networks in ``params_map``.

        Args:
            endpoint: The API endpoint to invoke (e.g. ``getTopology``).
            params_map: Dictionary of network names to request parameters.
            return_exceptions: Flag to return exceptions as objects instead of raising.

        Returns:
            A dictionary of network names to JSON responses (as Python dictionaries).

        Raises:
            ClientStoppedError: The HTTP client session pool is not running.
            ClientRuntimeError: One of the requests failed and ``return_exceptions`` is ``False``.

        Note:
            No request is sent for networks not present in ``params_map``.
        """
        if self._networks is None:
            raise ClientStoppedError()

        tasks = []
        for network_name, params in params_map.items():
            if network_name not in self._networks:
                continue

            tasks.append(self.request(network_name, endpoint, params))

        return dict(
            zip(
                params_map.keys(),
                await asyncio.gather(*tasks, return_exceptions=return_exceptions),
            )
        )

    @classmethod
    async def _refresh_token(cls) -> bool:
        """Update the JWT value from Keycloak."""
        if cls._session is None:
            raise ClientStoppedError()

        if cls._keycloak_client_id is None or cls._keycloak_client_secret is None:
            logging.error("Keycloak client ID and/or secret are missing from env")
            return False

        try:
            url = f"{cls._keycloak_host}/auth/realms/{cls._keycloak_realm}/protocol/openid-connect/token"
            logging.debug(f"Requesting new JWT from {url}")

            async with cls._session.post(
                url,
                timeout=1,
                data={
                    "grant_type": "client_credentials",
                    "client_id": cls._keycloak_client_id,
                    "client_secret": cls._keycloak_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            ) as resp:
                if resp.status != 200:
                    raise ClientRuntimeError(
                        f"Failed to refresh JWT: {resp.reason} ({resp.status})"
                    )

                cls._refresh_time = time.time()
                cls._jwt = cast(Dict, await resp.json())
                return True
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            raise ClientRuntimeError(msg="Failed to refresh JWT") from e
