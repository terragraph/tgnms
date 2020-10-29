#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
from typing import Any, Dict


class BaseClient(abc.ABC):
    @abc.abstractclassmethod
    async def start(cls, config: Dict[str, Any]) -> None:
        """Start underlying resources for the client.

        Args:
            config: Params and values for configuring the client.
        """
        pass

    @abc.abstractclassmethod
    async def stop(cls) -> None:
        """Cleanly stop the resources for the client."""
        pass

    @abc.abstractclassmethod
    async def healthcheck(cls) -> bool:
        """Evaluate the health of the client."""
        pass
