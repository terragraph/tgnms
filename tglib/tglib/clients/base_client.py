#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
