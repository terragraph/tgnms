#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import dataclasses
from typing import Dict, Optional


@dataclasses.dataclass
class HealthCheckResult:
    client: str
    healthy: bool
    msg: Optional[str] = None


class BaseClient(abc.ABC):
    @abc.abstractclassmethod
    async def start(cls, config: Dict) -> None:
        """Start underlying resources for the client."""
        pass

    @abc.abstractclassmethod
    async def stop(cls) -> None:
        """Cleanly stop the resources for the client."""
        pass

    @abc.abstractclassmethod
    async def health_check(cls) -> HealthCheckResult:
        """Evaluate the health of the client."""
        pass
