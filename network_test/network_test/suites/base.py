#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import abc
import asyncio
import dataclasses
import logging
from contextlib import suppress
from datetime import timedelta
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import insert
from tglib.clients import APIServiceClient, MySQLClient
from tglib.exceptions import ClientRuntimeError

from ..models import (
    NetworkTestDirection,
    NetworkTestResult,
    NetworkTestStatus,
    NetworkTestType,
)


@dataclasses.dataclass
class TestAsset:
    """Struct for representing an individual asset under test."""

    name: str
    src_node_mac: str
    dst_node_mac: str


class BaseTest(abc.ABC):
    def __init__(
        self,
        network_name: str,
        test_type: NetworkTestType,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: Optional[List[str]],
    ) -> None:
        self.network_name = network_name
        self.test_type = test_type
        self.direction = direction
        iperf_options["json"] = True
        self.iperf_options = iperf_options
        self.allowlist: List[str] = allowlist or []
        self.assets: List[TestAsset] = []
        self.session_ids: Set[str] = set()
        self.task: Optional[asyncio.Task] = None
        self.cleanup_handle: Optional[asyncio.Handle] = None

    @abc.abstractmethod
    async def prepare(self) -> bool:
        """Prepare the information needed to start the test.

        Fetch the network assets needed to start the test from the API service. If
        provided, use the test's allowlist to test specific assets.
        """
        pass

    @abc.abstractmethod
    async def start(self, execution_id: int, use_link_local: bool) -> None:
        """Start the test.

        Issue "startTraffic" iperf commands to the API service.
        """
        pass

    def estimate_duration(self) -> timedelta:
        """Estimate the test duration."""
        return timedelta(
            seconds=2
            if self.direction == NetworkTestDirection.BIDIRECTIONAL_SEQUENTIAL
            else 1
        )

    async def stop(self) -> bool:
        """Stop the test.

        Cancel the underlying asyncio Task object and issue "stopTraffic" commands to
        the API service.
        """
        # Cancel the task
        if self.task is None or self.cleanup_handle is None:
            return False

        self.task.cancel()
        self.cleanup_handle.cancel()
        with suppress(asyncio.CancelledError):
            await self.task

        # Stop traffic for all iperf sessions
        client = APIServiceClient(timeout=1)
        coros = [
            client.request(self.network_name, "stopTraffic", params={"id": session_id})
            for session_id in self.session_ids
        ]
        asyncio.gather(*coros, return_exceptions=True)

        self.session_ids.clear()
        return True

    async def save(
        self, requests: List[asyncio.Future], values: List[Dict[str, Any]]
    ) -> bool:
        """Save the per-asset test results in MySQL.

        Kick off the asyncio Futures and save the NetworkTestResult values in the
        database. Return True if any session started successfully, otherwise False.
        """
        for response, value in zip(
            await asyncio.gather(*requests, return_exceptions=True), values
        ):
            if isinstance(response, ClientRuntimeError):
                logging.error(response)
                value["status"] = NetworkTestStatus.FAILED
            elif "id" in response:
                self.session_ids.add(response["id"])
                value["status"] = NetworkTestStatus.RUNNING
            else:
                logging.error(response["message"])
                value["status"] = NetworkTestStatus.FAILED

        async with MySQLClient().lease() as sa_conn:
            query = insert(NetworkTestResult).values(values)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()

        return any(value["status"] == NetworkTestStatus.RUNNING for value in values)
