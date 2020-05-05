#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from contextlib import suppress
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, NoReturn, Optional, Tuple

from croniter import croniter
from sqlalchemy import delete, exists, func, insert, join, select, update
from tglib.clients import APIServiceClient, MySQLClient
from tglib.exceptions import ClientRuntimeError

from .models import (
    NetworkTestExecution,
    NetworkTestParams,
    NetworkTestResult,
    NetworkTestSchedule,
    NetworkTestStatus,
    NetworkTestType,
)
from .suites import BaseTest, Multihop, Parallel, Sequential, TestAsset


class Schedule:
    def __init__(self, enabled: bool, cron_expr: str) -> None:
        self.enabled = enabled
        self.cron_expr = cron_expr
        self.task: Optional[asyncio.Task] = None

    async def start(
        self, test: BaseTest, test_type: NetworkTestType, params_id: int
    ) -> NoReturn:
        """Start the schedule task.

        Loops forever and tries to start a new test execution when the cron
        expression is evaluated.
        """
        iter = croniter(self.cron_expr, datetime.now())

        while True:
            logging.info(
                f"A {test_type.value} test is scheduled for "
                f"{iter.get_next(datetime)} on {test.network_name}"
            )

            # Sleep until it is time to run
            await asyncio.sleep(iter.get_current() - time.time())

            # Skip if the schedule is disabled
            if not self.enabled:
                logging.info("Schedule is currently disabled, skipping...")
                continue

            # Skip if the network is occupied
            if await Scheduler.is_network_busy(test.network_name):
                logging.warning(f"A test is already running on {test.network_name}")
                continue

            # Skip if the test assets could not be prepared
            prepare_output = await test.prepare()
            if prepare_output is None:
                logging.error("Failed to prepare network test assets")
                continue

            # Skip if no assets were found using the whitelist
            test_assets, _ = prepare_output
            if test.whitelist and not test_assets:
                logging.error(f"No test assets matched whitelist: {test.whitelist}")
                continue

            # Start the test if all the "skip checks" are negative
            await Scheduler.start_execution(test, test_type, prepare_output, params_id)

    async def stop(self) -> bool:
        """Stop the schedule task.

        Cancel the task and await the result.
        """
        # Cancel the task
        if self.task is None or not self.task.cancel():
            return False
        with suppress(asyncio.CancelledError):
            await self.task

        return True


class Scheduler:
    timeout: int = 0
    _schedules: Dict[int, Schedule] = {}
    _executions: Dict[int, BaseTest] = {}

    @classmethod
    def has_schedule(cls, schedule_id: int) -> bool:
        """Verify that a schedule_id belongs to a running schedule."""
        return schedule_id in cls._schedules

    @classmethod
    def has_execution(cls, execution_id: int) -> bool:
        """Verify that an execution_id belongs to a running execution."""
        return execution_id in cls._executions

    @classmethod
    def get_execution(cls, session_id: str) -> Optional[Tuple[int, BaseTest]]:
        """Get the test execution and ID for a particular iperf session_id."""
        for id, execution in cls._executions.items():
            if session_id in execution.session_ids:
                return id, execution

        return None

    @classmethod
    async def restart(cls) -> None:
        """Clean up any stray sessions and restart the schedules in the DB."""
        # Stop all stale running tests
        try:
            client = APIServiceClient(timeout=1)
            statuses = await client.request_all("statusTraffic")
            for network_name, sessions in statuses.items():
                session_ids = sessions.get("sessions")
                if session_ids is None:
                    continue

                tasks = [
                    client.request(network_name, "stopTraffic", params={"id": id})
                    for id in session_ids
                ]

                await asyncio.gather(*tasks)
        except ClientRuntimeError:
            logging.exception("Failed to stop one or more iperf session(s)")

        # Mark all stale running executions + test results as ABORTED in the DB
        async with MySQLClient().lease() as sa_conn:
            update_execution_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.status == NetworkTestStatus.RUNNING)
                .values(status=NetworkTestStatus.ABORTED)
            )
            await sa_conn.execute(update_execution_query)

            update_result_query = (
                update(NetworkTestResult)
                .where(NetworkTestResult.status == NetworkTestStatus.RUNNING)
                .values(status=NetworkTestStatus.ABORTED)
            )
            await sa_conn.execute(update_result_query)
            await sa_conn.connection.commit()

        # Start all of the schedules in the DB
        for row in await cls.list_schedules():
            test: BaseTest
            if row.test_type == NetworkTestType.MULTIHOP:
                test = Multihop(row.network_name, row.iperf_options, row.whitelist)
            elif row.test_type == NetworkTestType.PARALLEL:
                test = Parallel(row.network_name, row.iperf_options, row.whitelist)
            elif row.test_type == NetworkTestType.SEQUENTIAL:
                test = Sequential(row.network_name, row.iperf_options, row.whitelist)

            schedule = Schedule(row.enabled, row.cron_expr)
            cls._schedules[row.id] = schedule
            schedule.task = asyncio.create_task(
                schedule.start(test, row.test_type, row.params_id)
            )

    @classmethod
    async def add_schedule(
        cls, schedule: Schedule, test: BaseTest, test_type: NetworkTestType
    ) -> int:
        """Add a new schedule to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            insert_schedule_query = insert(NetworkTestSchedule).values(
                enabled=schedule.enabled, cron_expr=schedule.cron_expr
            )
            schedule_row = await sa_conn.execute(insert_schedule_query)
            schedule_id = schedule_row.lastrowid

            insert_params_query = insert(NetworkTestParams).values(
                schedule_id=schedule_id,
                test_type=test_type,
                network_name=test.network_name,
                iperf_options=test.iperf_options,
                whitelist=test.whitelist or None,
            )
            params_row = await sa_conn.execute(insert_params_query)
            params_id = params_row.lastrowid
            await sa_conn.connection.commit()

        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, test_type, params_id))
        return schedule_id

    @classmethod
    async def modify_schedule(
        cls,
        schedule_id: int,
        enabled: bool,
        cron_expr: str,
        network_name: str,
        iperf_options: Dict[str, Any],
        whitelist: List[str],
    ) -> bool:
        """Stop the running schedule, update the DB, and restart."""
        async with MySQLClient().lease() as sa_conn:
            update_schedule_query = (
                update(NetworkTestSchedule)
                .where(NetworkTestSchedule.id == schedule_id)
                .values(enabled=enabled, cron_expr=cron_expr)
            )
            await sa_conn.execute(update_schedule_query)

            get_params_query = (
                select([NetworkTestParams])
                .where(NetworkTestParams.schedule_id == schedule_id)
                .order_by(NetworkTestParams.id.desc())
                .limit(1)
            )
            cursor = await sa_conn.execute(get_params_query)
            params_row = await cursor.first()
            params_id = params_row.id

            test: BaseTest
            test_type = params_row.test_type
            if test_type == NetworkTestType.MULTIHOP:
                test = Multihop(network_name, iperf_options, whitelist)
            elif test_type == NetworkTestType.PARALLEL:
                test = Parallel(network_name, iperf_options, whitelist)
            elif test_type == NetworkTestType.SEQUENTIAL:
                test = Sequential(network_name, iperf_options, whitelist)

            # Insert new params row if the values differ
            if not (
                params_row.network_name == test.network_name
                and params_row.iperf_options == test.iperf_options
                and set(params_row.whitelist or []) == set(test.whitelist)
            ):
                insert_params_query = insert(NetworkTestParams).values(
                    schedule_id=schedule_id,
                    test_type=test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
                    whitelist=test.whitelist or None,
                )
                params_row = await sa_conn.execute(insert_params_query)
                params_id = params_row.lastrowid

            await sa_conn.connection.commit()

        # Stop the existing schedule
        prev_schedule = cls._schedules[schedule_id]
        if not await prev_schedule.stop():
            return False

        # Start the new schedule
        schedule = Schedule(enabled, cron_expr)
        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, test_type, params_id))
        return True

    @classmethod
    async def delete_schedule(cls, schedule_id: int) -> bool:
        """Stop the schedule and delete the entry from the DB."""
        schedule = cls._schedules[schedule_id]
        if not await schedule.stop():
            return False

        async with MySQLClient().lease() as sa_conn:
            query = delete(NetworkTestSchedule).where(
                NetworkTestSchedule.id == schedule_id
            )
            await sa_conn.execute(query)
            await sa_conn.connection.commit()

        del cls._schedules[schedule_id]
        return True

    @classmethod
    async def start_execution(
        cls,
        test: BaseTest,
        test_type: NetworkTestType,
        prepare_output: Tuple[List[TestAsset], timedelta],
        params_id: Optional[int] = None,
    ) -> int:
        """Add a new execution to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            if params_id is None:
                insert_params_query = insert(NetworkTestParams).values(
                    test_type=test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
                    whitelist=test.whitelist or None,
                )
                params_row = await sa_conn.execute(insert_params_query)
                params_id = params_row.lastrowid

            insert_execution_query = insert(NetworkTestExecution).values(
                params_id=params_id, status=NetworkTestStatus.RUNNING
            )
            execution_row = await sa_conn.execute(insert_execution_query)
            execution_id = execution_row.lastrowid
            await sa_conn.connection.commit()

        # Start the test
        cls._executions[execution_id] = test
        test_assets, estimated_duration = prepare_output
        test.task = asyncio.create_task(test.start(execution_id, test_assets))

        # Schedule the cleanup task
        loop = asyncio.get_event_loop()
        test.cleanup_handle = loop.call_later(
            estimated_duration.total_seconds() + cls.timeout,
            asyncio.create_task,
            cls.stop_execution(execution_id),
        )

        return execution_id

    @classmethod
    async def stop_execution(cls, execution_id: int) -> bool:
        """Stop the execution and mark it as aborted in the DB."""
        test = cls._executions[execution_id]
        async with MySQLClient().lease() as sa_conn:
            update_result_query = (
                update(NetworkTestResult)
                .where(
                    (NetworkTestResult.execution_id == execution_id)
                    & (NetworkTestResult.status == NetworkTestStatus.RUNNING)
                )
                .values(status=NetworkTestStatus.ABORTED)
            )

            # Mark the entire execution as ABORTED if any sessions had to be terminated
            result = await sa_conn.execute(update_result_query)
            update_execution_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.id == execution_id)
                .values(
                    status=NetworkTestStatus.FAILED
                    if not test.session_ids
                    else NetworkTestStatus.ABORTED
                    if result.rowcount
                    else NetworkTestStatus.FINISHED
                )
            )
            await sa_conn.execute(update_execution_query)
            await sa_conn.connection.commit()

        # Stop the test
        if not await test.stop():
            return False

        del cls._executions[execution_id]
        return True

    @staticmethod
    async def describe_schedule(
        schedule_id: int,
    ) -> Optional[Tuple[Iterable, Iterable]]:
        """Fetch a particular schedule and its execution history given the ID."""
        async with MySQLClient().lease() as sa_conn:
            get_schedule_query = select([NetworkTestSchedule]).where(
                NetworkTestSchedule.id == schedule_id
            )
            cursor = await sa_conn.execute(get_schedule_query)
            schedule = await cursor.first()
            if not schedule:
                return None

            get_executions_query = select(
                [
                    NetworkTestParams.test_type,
                    NetworkTestParams.network_name,
                    NetworkTestParams.iperf_options,
                    NetworkTestParams.whitelist,
                    NetworkTestExecution,
                ]
            ).select_from(
                join(
                    join(
                        NetworkTestParams,
                        NetworkTestSchedule,
                        NetworkTestParams.schedule_id == NetworkTestSchedule.id,
                    ),
                    NetworkTestExecution,
                    NetworkTestExecution.params_id == NetworkTestParams.id,
                )
            )
            cursor = await sa_conn.execute(get_executions_query)
            return schedule, await cursor.fetchall()

    @staticmethod
    async def list_schedules(
        test_type: Optional[NetworkTestType] = None,
        network_name: Optional[str] = None,
        protocol: Optional[int] = None,
        partial: Optional[bool] = None,
    ) -> Iterable:
        """Fetch all the schedules, or a subset, with optional filtering."""
        async with MySQLClient().lease() as sa_conn:
            query = (
                select(
                    [
                        NetworkTestSchedule,
                        NetworkTestParams.id.label("params_id"),
                        NetworkTestParams.test_type,
                        NetworkTestParams.network_name,
                        NetworkTestParams.iperf_options,
                        NetworkTestParams.whitelist,
                    ]
                )
                .select_from(
                    join(
                        NetworkTestParams,
                        NetworkTestSchedule,
                        NetworkTestParams.schedule_id == NetworkTestSchedule.id,
                    )
                )
                .where(
                    NetworkTestParams.id.in_(
                        select([func.max(NetworkTestParams.id)]).group_by(
                            NetworkTestParams.schedule_id
                        )
                    )
                )
            )

            # Add filter conditions
            if test_type is not None:
                query = query.where(NetworkTestParams.test_type == test_type)
            if network_name is not None:
                query = query.where(NetworkTestParams.network_name == network_name)
            if protocol is not None:
                query = query.where(
                    NetworkTestParams.iperf_options["protocol"] == protocol
                )
            if partial is not None:
                if partial:
                    query = query.where(NetworkTestParams.whitelist.isnot(None))
                else:
                    query = query.where(NetworkTestParams.whitelist.is_(None))

            cursor = await sa_conn.execute(query)
            return await cursor.fetchall()

    @staticmethod
    async def describe_execution(
        execution_id: int,
    ) -> Optional[Tuple[Iterable, Iterable]]:
        """Fetch a particular execution and its results given the ID."""
        async with MySQLClient().lease() as sa_conn:
            get_execution_query = (
                select(
                    [
                        NetworkTestExecution,
                        NetworkTestParams.test_type,
                        NetworkTestParams.network_name,
                        NetworkTestParams.iperf_options,
                        NetworkTestParams.whitelist,
                    ]
                )
                .select_from(
                    join(
                        NetworkTestExecution,
                        NetworkTestParams,
                        NetworkTestExecution.params_id == NetworkTestParams.id,
                    )
                )
                .where(NetworkTestExecution.id == execution_id)
            )
            cursor = await sa_conn.execute(get_execution_query)
            execution = await cursor.first()
            if not execution:
                return None

            ignore_cols = {"execution_id", "iperf_client_blob", "iperf_server_blob"}
            get_results_query = select(
                filter(
                    lambda col: col.key not in ignore_cols,
                    NetworkTestResult.__table__.columns,
                )
            ).where(NetworkTestResult.execution_id == execution_id)
            cursor = await sa_conn.execute(get_results_query)
            return execution, await cursor.fetchall()

    @staticmethod
    async def list_executions(
        test_type: Optional[NetworkTestType] = None,
        network_name: Optional[str] = None,
        protocol: Optional[int] = None,
        partial: Optional[bool] = None,
        status: Optional[NetworkTestStatus] = None,
        start_dt: Optional[datetime] = None,
    ) -> Iterable:
        """Fetch all the executions, or a subset, with optional filtering."""
        async with MySQLClient().lease() as sa_conn:
            query = select(
                [
                    NetworkTestExecution,
                    NetworkTestParams.test_type,
                    NetworkTestParams.network_name,
                    NetworkTestParams.iperf_options,
                    NetworkTestParams.whitelist,
                ]
            ).select_from(
                join(
                    NetworkTestExecution,
                    NetworkTestParams,
                    NetworkTestExecution.params_id == NetworkTestParams.id,
                )
            )

            # Add filter conditions
            if test_type is not None:
                query = query.where(NetworkTestParams.test_type == test_type)
            if network_name is not None:
                query = query.where(NetworkTestParams.network_name == network_name)
            if protocol is not None:
                query = query.where(
                    NetworkTestParams.iperf_options["protocol"] == protocol
                )
            if partial is not None:
                if partial:
                    query = query.where(NetworkTestParams.whitelist.isnot(None))
                else:
                    query = query.where(NetworkTestParams.whitelist.is_(None))
            if status is not None:
                query = query.where(NetworkTestExecution.status == status)
            if start_dt is not None:
                query = query.where(NetworkTestExecution.start_dt >= start_dt)

            cursor = await sa_conn.execute(query)
            return await cursor.fetchall()

    @staticmethod
    async def is_network_busy(network_name: str) -> bool:
        """Check if a test is currently running on the network."""
        async with MySQLClient().lease() as sa_conn:
            query = select(
                [
                    exists()
                    .where(
                        (NetworkTestExecution.status == NetworkTestStatus.RUNNING)
                        & (NetworkTestParams.network_name == network_name)
                    )
                    .select_from(
                        join(
                            NetworkTestExecution,
                            NetworkTestParams,
                            NetworkTestExecution.params_id == NetworkTestParams.id,
                        )
                    )
                ]
            )
            return await sa_conn.scalar(query)
