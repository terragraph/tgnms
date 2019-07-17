#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Provide HTTP client.

This module provides a wrapper class which facilitates asynchronous HTTP
requests to any external HTTP endpoint.

Attributes:
    ClientSessionWrapper
    get_shared_session() -> ClientSessionWrapper
    HTTPClient
"""

import asyncio
import logging
from typing import Dict, NoReturn, Optional, Union

import aiohttp


class ClientSessionWrapper:
    """Start the session pool.

    The session pool can only be created using an asynchronous context manager.
    This removes the burden of having to manually close and clean up the session
    pool from developers. Only one active session can exist during the lifetime
    of the program, otherwise, a RuntimeError will be raised.

    _session: Session pool.
    """

    _session = None

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        if self._session is not None:
            raise RuntimeError("Cannot use session more than once")

        self._session = aiohttp.ClientSession(*self.args, **self.kwargs)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._session.close()
        self._session = None

    @property
    def session(self) -> aiohttp.ClientSession:
        """Get the session object.

        Use with a context manager to ensure that the session recycles the
        connection.

        Returns:
            Session object.

        Raises:
            RuntimeError: The function is called before the context manager is
            used to actually create the session object.
        """

        if self._session is None:
            raise RuntimeError(
                "Cannot get the session before using the context manager."
            )

        return self._session


_shared_session: Optional[ClientSessionWrapper] = None


def get_shared_session(*args, **kwargs) -> ClientSessionWrapper:
    """Return the singleton HTTP session pool."""

    global _shared_session
    if _shared_session is None:
        _shared_session = ClientSessionWrapper(*args, **kwargs)

    return _shared_session


class HTTPClient:
    """Facilitate HTTP requests.

    Params:
        host: Destination hostname.
        port: Destination port.
        timeout: Session timeout.
    """

    def __init__(self, host: str, port: int, timeout: int = 1) -> NoReturn:
        self.host = host
        self.port = port
        self.timeout = timeout

    async def get(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Return the results of a GET request with params to the endpoint.

        Args:
            endpoint: HTTP server path.
            params: (Optional) Dictionary of params to use as the query string.

        Returns:
            Decoded results if the HTTP status is 200, else None.
        """

        url = f"http://{self.host}:{self.port}/{endpoint}"

        try:
            session = get_shared_session().session
            async with session.get(url, params=params, timeout=self.timeout) as resp:
                if resp.status == 200:
                    return await resp.json(encoding="utf-8")

                logging.error(
                    f"GET request to '{url}' with args: "
                    f"{params} failed: {resp.reason} ({resp.status})"
                )
        except aiohttp.ClientError as e:
            logging.error(f"Client error sending GET request: {str(e)}")
        except asyncio.TimeoutError:
            logging.error("GET request timed out")
        except Exception:
            logging.exception("Unknown exception occurred sending GET request")

        return None

    async def post(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict]:
        """Return the results of a POST request with params to the endpoint.

        Args:
            endpoint: HTTP server path.
            params: (Optional) Dictionary of params to supply in request body.

        Returns:
            Decoded results if the HTTP status is 200, else None.
        """

        url = f"http://{self.host}:{self.port}/{endpoint}"

        try:
            session = get_shared_session().session
            async with session.post(url, json=params, timeout=self.timeout) as resp:
                if resp.status == 200:
                    return await resp.json(encoding="utf-8")

                logging.error(
                    f"POST request to '{url}' with args: "
                    f"{params} failed: {resp.reason} ({resp.status})"
                )
        except aiohttp.ClientError as e:
            logging.error(f"Client error sending POST request: {str(e)}")
        except asyncio.TimeoutError:
            logging.error("POST request timed out")
        except Exception:
            logging.exception("Unknown exception occurred sending POST request")

        return None
