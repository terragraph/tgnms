#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Optional


class TGLibError(Exception):
    """Base class for all TGLib errors."""

    pass


class ConfigError(TGLibError):
    """Raised if there is an error reading or consuming the layered config."""

    pass


class DuplicateRouteError(TGLibError):
    """Raised if a route has the same method and path as a base route."""

    def __init__(self, method: str, path: str, msg: Optional[str] = None):
        if msg is None:
            msg = f"A route with method, {method}, and path, {path}, already exists"
        super().__init__(msg)
        self.method = method
        self.path = path


class ClientError(TGLibError):
    """Base class for all client errors."""

    pass


class ClientUninitializedError(ClientError):
    """Raised if a get_instance is called before the client is initialized."""

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Cannot fetch singleton instance prior to initialization"
        super().__init__(msg)


class ClientMultipleInitializationError(ClientError):
    """Raised if a client is initialized more than once."""

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Cannot initialize client more than once"
        super().__init__(msg)


class ClientRestartError(ClientError):
    """Raised if a client is started while already running."""

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Cannot start client more than once"
        super().__init__(msg)


class ClientStoppedError(ClientError):
    """Raised if the client is consumed when not running."""

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "Client is not currently running"
        super().__init__(msg)


class ClientRuntimeError(ClientError):
    """Raised if client behavior fails for any other reason after initialization."""

    def __init__(self, msg: Optional[str] = None):
        if msg is None:
            msg = "An unknown issue with the client occurred at runtime"
        super().__init__(msg)
