#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
from typing import Dict


class BaseClient(abc.ABC):
    @abc.abstractclassmethod
    async def start(cls, config: Dict) -> None:
        """Start underlying resources for the client."""
        pass

    @abc.abstractclassmethod
    async def stop(cls) -> None:
        """Cleanly stop the resources for the client."""
        pass
