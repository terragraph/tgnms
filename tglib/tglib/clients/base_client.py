#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import dataclasses
from typing import Dict, Optional

from tglib.exceptions import ClientMultipleInitializationError, ClientUninitializedError


@dataclasses.dataclass
class HealthCheckResult:
    client: str
    healthy: bool
    msg: Optional[str] = None


class ABCMetaSingleton(abc.ABCMeta):
    _instances: Dict = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
            return cls._instances[cls]

        raise ClientMultipleInitializationError()


class BaseClient(metaclass=ABCMetaSingleton):
    @classmethod
    def get_instance(cls):
        """Get the singleton instance."""
        if cls not in cls._instances:
            raise ClientUninitializedError()

        return cls._instances[cls]

    @abc.abstractmethod
    async def start(self) -> None:
        """Start underlying resources for the client."""
        pass

    @abc.abstractmethod
    async def stop(self) -> None:
        """Cleanly stop the resources for the client."""
        pass

    @abc.abstractmethod
    async def health_check(self) -> HealthCheckResult:
        """Evaluate the health of the client."""
        pass
