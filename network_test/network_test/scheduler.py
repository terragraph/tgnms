#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from contextlib import suppress
from datetime import datetime
from functools import partial
from typing import Dict, Iterable, NoReturn, Optional

from croniter import croniter
from sqlalchemy import delete, exists, insert, join, select, update
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
from .suites import BaseTest, MultihopTest, ParallelTest, SequentialTest


class Schedule:
    def __init__(self, enabled: bool, cron_expr: str) -> None:
        self.enabled = enabled
        self.cron_expr = cron_expr
        self.task: Optional[asyncio.Task] = None

    async def start(
        self, test: BaseTest, test_type: NetworkTestType, params_id: int
    ) -> NoReturn:
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

            # Start the test if the network is unoccupied
            if await Scheduler.is_network_busy(test.network_name):
                logging.warning(f"A test is already running on {test.network_name}")
            else:
                await Scheduler.start_execution(test, test_type, params_id)

    async def stop(self) -> bool:
        # Cancel the task
        if self.task is None or not self.task.cancel():
            return False
        with suppress(asyncio.CancelledError):
            await self.task

        return True


class Scheduler:
    _schedules: Dict[int, Schedule] = {}
    _executions: Dict[int, BaseTest] = {}

    @classmethod
    def has_schedule(cls, schedule_id: int) -> bool:
        return schedule_id in cls._schedules

    @classmethod
    def has_execution(cls, execution_id: int) -> bool:
        return execution_id in cls._executions

    @classmethod
    def get_execution_id(cls, session_id: str) -> Optional[int]:
        for id, execution in cls._executions.items():
            if session_id in execution.session_ids:
                return id

        return None

    @classmethod
    async def restart(cls) -> None:
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
            schedule = Schedule(row.enabled, row.cron_expr)

            test: BaseTest
            if row.test_type == NetworkTestType.MULTIHOP_TEST:
                test = MultihopTest(row.network_name, row.iperf_options)
            elif row.test_type == NetworkTestType.PARALLEL_LINK_TEST:
                test = ParallelTest(row.network_name, row.iperf_options)
            elif row.test_type == NetworkTestType.SEQUENTIAL_LINK_TEST:
                test = SequentialTest(row.network_name, row.iperf_options)

            cls._schedules[row.id] = schedule
            schedule.task = asyncio.create_task(
                schedule.start(test, row.test_type, row.params_id)
            )

    @classmethod
    async def add_schedule(
        cls, schedule: Schedule, test: BaseTest, test_type: NetworkTestType
    ) -> int:
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
        schedule: Schedule,
        test: BaseTest,
        test_type: NetworkTestType,
    ) -> bool:
        prev_schedule = cls._schedules[schedule_id]
        if not await prev_schedule.stop():
            return False

        async with MySQLClient().lease() as sa_conn:
            update_schedule_query = (
                update(NetworkTestSchedule)
                .where(NetworkTestSchedule.id == schedule_id)
                .values(enabled=schedule.enabled, cron_expr=schedule.cron_expr)
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

            if not (
                params_row.test_type == test_type
                and params_row.network_name == test.network_name
                and params_row.iperf_options == test.iperf_options
            ):
                insert_params_query = insert(NetworkTestParams).values(
                    schedule_id=schedule_id,
                    test_type=test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
                )

                params_row = await sa_conn.execute(insert_params_query)
                params_id = params_row.lastrowid

            await sa_conn.connection.commit()

        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, test_type, params_id))
        return True

    @classmethod
    async def delete_schedule(cls, schedule_id: int) -> bool:
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
        cls, test: BaseTest, test_type: NetworkTestType, params_id: Optional[int] = None
    ) -> Optional[int]:
        prepare_output = await test.prepare()
        if prepare_output is None:
            return None

        async with MySQLClient().lease() as sa_conn:
            if params_id is None:
                insert_params_query = insert(NetworkTestParams).values(
                    test_type=test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
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
        cleanup = partial(asyncio.create_task, cls.stop_execution(execution_id))
        loop = asyncio.get_event_loop()
        loop.call_at(loop.time() + estimated_duration.total_seconds(), cleanup)

        return execution_id

    @classmethod
    async def stop_execution(cls, execution_id: int) -> bool:
        test = cls._executions[execution_id]
        num_sessions = len(test.session_ids)
        if not await test.stop():
            return False

        async with MySQLClient().lease() as sa_conn:
            update_result_query = (
                update(NetworkTestResult)
                .where(
                    (NetworkTestResult.execution_id == execution_id)
                    & (NetworkTestResult.status == NetworkTestStatus.RUNNING)
                )
                .values(status=NetworkTestStatus.ABORTED)
            )

            # Mark the entire execution as ABORTED if all sessions had to be terminated
            result = await sa_conn.execute(update_result_query)
            update_execution_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.id == execution_id)
                .values(
                    status=NetworkTestStatus.ABORTED
                    if result.rowcount == num_sessions
                    else NetworkTestStatus.FINISHED
                )
            )

            await sa_conn.execute(update_execution_query)
            await sa_conn.connection.commit()

        del cls._executions[execution_id]
        return True

    @staticmethod
    async def list_schedules(schedule_id: Optional[int] = None) -> Iterable:
        async with MySQLClient().lease() as sa_conn:
            query = (
                select(
                    [
                        NetworkTestSchedule,
                        NetworkTestParams.id.label("params_id"),
                        NetworkTestParams.test_type,
                        NetworkTestParams.network_name,
                        NetworkTestParams.iperf_options,
                    ]
                )
                .select_from(
                    join(
                        NetworkTestParams,
                        NetworkTestSchedule,
                        NetworkTestParams.schedule_id == NetworkTestSchedule.id,
                    )
                )
                .order_by(NetworkTestParams.id.desc())
                .limit(1)
            )

            if schedule_id is None:
                cursor = await sa_conn.execute(query)
                return await cursor.fetchall()
            else:
                query = query.where(NetworkTestSchedule.id == schedule_id)
                cursor = await sa_conn.execute(query)
                return await cursor.first() or {}

    @staticmethod
    async def list_executions(execution_id: Optional[int] = None) -> Iterable:
        async with MySQLClient().lease() as sa_conn:
            query = select(
                [
                    NetworkTestExecution,
                    NetworkTestParams.test_type,
                    NetworkTestParams.network_name,
                    NetworkTestParams.iperf_options,
                ]
            ).select_from(
                join(
                    NetworkTestExecution,
                    NetworkTestParams,
                    NetworkTestExecution.params_id == NetworkTestParams.id,
                )
            )

            if execution_id is None:
                cursor = await sa_conn.execute(query)
                return await cursor.fetchall()
            else:
                query = query.where(NetworkTestExecution.id == execution_id)
                cursor = await sa_conn.execute(query)
                return await cursor.first() or {}

    @staticmethod
    async def list_results(execution_id: int) -> Iterable:
        async with MySQLClient().lease() as sa_conn:
            ignore_cols = {"execution_id", "iperf_client_blob", "iperf_server_blob"}
            query = select(
                filter(
                    lambda col: col.key not in ignore_cols,
                    NetworkTestResult.__table__.columns,
                )
            ).where(NetworkTestResult.execution_id == execution_id)

            cursor = await sa_conn.execute(query)
            return await cursor.fetchall()

    @staticmethod
    async def is_network_busy(network_name: str) -> bool:
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

            cursor = await sa_conn.execute(query)
            return await cursor.scalar()
