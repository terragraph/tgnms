#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from typing import Optional


class TGLibError(Exception):
    """Base class for all :mod:`tglib` errors."""

    pass


class ConfigError(TGLibError):
    """Raised if there is an error reading or consuming the layered config."""

    pass


class DuplicateRouteError(TGLibError):
    """Raised if more than one route has the same method and path.

    Args:
        method: The ``HTTP`` method used by the route.
        path: The ``URL`` path used by the route.
        msg: The exception message.
    """

    def __init__(self, method: str, path: str, msg: Optional[str] = None):
        if msg is None:
            msg = f"A route with method, {method}, and path, {path}, already exists"
        super().__init__(msg)
        self.method = method
        self.path = path


class ClientError(TGLibError):
    """Base class for all client errors."""

    pass


class ClientRestartError(ClientError):
    """Raised if a client is started while already running.

    Args:
        msg: The exception message.
    """

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Cannot start client more than once"
        super().__init__(msg)


class ClientStoppedError(ClientError):
    """Raised if the client is consumed when not running.

    Args:
        msg: The exception message.
    """

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Client is not currently running"
        super().__init__(msg)


class ClientRuntimeError(ClientError):
    """Raised if client behavior fails for any other reason after initialization.

    Args:
        msg: The exception message.
    """

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "An unknown issue with the client occurred at runtime"
        super().__init__(msg)
