#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import asyncio
import logging
from contextlib import suppress
from typing import Dict, List, Optional

from tglib.clients import APIServiceClient
from tglib.exceptions import ClientRuntimeError


class BaseTest(abc.ABC):
    def __init__(self, network_name: str, iperf_options: Dict) -> None:
        self.network_name = network_name
        self.iperf_options = iperf_options
        self.session_ids: List[str] = []
        self.task: Optional[asyncio.Task] = None

    @abc.abstractmethod
    async def start(self) -> None:
        pass

    async def stop(self) -> bool:
        # Cancel the task
        if self.task is None or not self.task.cancel():
            return False

        with suppress(asyncio.CancelledError):
            await self.task

        # Stop traffic for all iperf sessions
        client = APIServiceClient(timeout=1)
        coros = [
            client.request(self.network_name, "stopTraffic", params={"id": session_id})
            for session_id in self.session_ids
        ]

        try:
            await asyncio.gather(*coros)
        except ClientRuntimeError:
            logging.exception("Failed to stop one or more iperf session(s)")

        self.session_ids.clear()
        return True
