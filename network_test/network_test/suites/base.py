#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import asyncio
import dataclasses
import logging
from contextlib import suppress
from datetime import timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import insert
from tglib.clients import APIServiceClient, MySQLClient
from tglib.exceptions import ClientRuntimeError

from ..models import NetworkTestResult, NetworkTestStatus


@dataclasses.dataclass
class TestAsset:
    """Struct for representing an individual asset under test."""

    src_node_mac: str
    dst_node_mac: str
    link_name: Optional[str] = None


class BaseTest(abc.ABC):
    def __init__(
        self,
        network_name: str,
        iperf_options: Dict[str, Any],
        whitelist: Optional[List[str]],
    ) -> None:
        self.network_name = network_name
        self.iperf_options = iperf_options
        self.whitelist: List[str] = whitelist or []
        self.session_ids: Set[str] = set()
        self.task: Optional[asyncio.Task] = None

    @abc.abstractmethod
    async def prepare(self) -> Optional[Tuple[List[TestAsset], timedelta]]:
        """Prepare the information needed to start the test.

        Fetch the network assets needed to start the test from the API service and
        estimate the time it would take the test to complete (in seconds).

        If provided, use the test's whitelist to test specific assets.
        """
        pass

    @abc.abstractmethod
    async def start(self, execution_id: int, test_assets: List[TestAsset]) -> None:
        """Start the test.

        Issue "startTraffic" iperf commands to the API service.
        """
        pass

    async def stop(self) -> bool:
        """Stop the test.

        Cancel the underlying asyncio Task object and issue "stopTraffic" commands to
        the API service.
        """
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

    async def save(
        self, requests: List[asyncio.Future], values: List[Dict[str, Any]]
    ) -> bool:
        """Save the per-link test results in MySQL.

        Kick off the asyncio Futures and save the NetworkTestResult values in the
        database. Return True if the sessions started successfully, otherwise False.
        """
        for response, value in zip(
            await asyncio.gather(*requests, return_exceptions=True), values
        ):
            if isinstance(response, ClientRuntimeError):
                logging.error(response, exc_info=True)
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

        return value["status"] == NetworkTestStatus.RUNNING
