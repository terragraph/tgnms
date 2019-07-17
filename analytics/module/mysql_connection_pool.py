#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Provide functions for manipulating a MySQL singleton connection pool.

Attributes:
    get_shared_pool() -> aiomysql.sa.Engine
    MySQLConnectionPool
"""

from typing import NoReturn, Optional

from aiomysql.sa import Engine, SAConnection, create_engine


_shared_pool: Optional[Engine] = None


def get_shared_pool(*args, **kwargs) -> Engine:
    """Return the singleton MySQL connection pool."""

    global _shared_pool
    if _shared_pool is None:
        _shared_pool = MySQLConnectionPool(*args, **kwargs)

    return _shared_pool


class MySQLConnectionPool:
    """Start the connection pool and lease connections.

    The connection pool can only be created using an asynchronous context
    mananger. This removes the burden of having to manually close and clean up
    the connection pool from developers. Only one active connection pool can
    exist during the lifetime of the program, otherwise, a RuntimeError will be
    raised.

    _pool: Connection pool.
    """

    _pool = None

    def __init__(self, *args, **kwargs) -> NoReturn:
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        if self._pool is not None:
            raise RuntimeError("Cannot use pool more than once")

        self._pool = await create_engine(*self.args, **self.kwargs)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._pool.close()
        await self._pool.wait_closed()
        self._pool = None

    def lease(self) -> SAConnection:
        """Lease a connection from the pool.

        Use with a context manager to ensure that the connection is returned to
        the pool.

        Returns:
            A connection from the pool, if available.

        Raises:
            RuntimeError: The function is called before the context manager is
            used to actually create the engine object.
        """

        if self._pool is None:
            raise RuntimeError(
                "Cannot get a connection before using the context manager."
            )

        return self._pool.acquire()
