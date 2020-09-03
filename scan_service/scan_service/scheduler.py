#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from contextlib import suppress
from datetime import datetime
from enum import Enum
from typing import Dict, Iterable, NoReturn, Optional, Tuple

from croniter import croniter
from sqlalchemy import delete, func, insert, join, select, update
from tglib.clients import MySQLClient

from .models import (
    ConnectivityResults,
    InterferenceResults,
    ScanMode,
    ScanResults,
    ScanTestExecution,
    ScanTestParams,
    ScanTestSchedule,
    ScanTestStatus,
    ScanType,
)
from .scan import ScanTest


class Schedule:
    def __init__(self, enabled: bool, cron_expr: str) -> None:
        self.enabled = enabled
        self.cron_expr = cron_expr
        self.task: Optional[asyncio.Task] = None

    async def start(self, test: ScanTest, params_id: int) -> NoReturn:
        """Start the schedule task.

        Loops forever and tries to start a new scan execution when the cron
        expression is evaluated.
        """
        iter = croniter(self.cron_expr, datetime.now())

        while True:
            logging.info(
                f"{test.type.name} scan is scheduled for "
                f"{iter.get_next(datetime)} on {test.network_name}"
            )

            # Sleep until it is time to run
            await asyncio.sleep(iter.get_current() - time.time())

            # Skip if the schedule is disabled
            if not self.enabled:
                logging.info("Schedule is currently disabled, skipping...")
                continue

            # Start the scan
            await Scheduler.start_execution(test, params_id)

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
    _schedules: Dict[int, Schedule] = {}
    executions: Dict[int, ScanTest] = {}
    SCAN_START_DELAY_S = 5
    CLEAN_UP_DELAY_S = 60

    @classmethod
    def has_schedule(cls, schedule_id: int) -> bool:
        """Verify that a schedule_id belongs to a running schedule."""
        return schedule_id in cls._schedules

    @classmethod
    def get_execution(
        cls, token: int, network_name: str
    ) -> Optional[Tuple[int, ScanTest]]:
        """Get the test execution and ID for a particular scan token."""
        for id, execution in cls.executions.items():
            if execution.network_name == network_name and token in range(
                execution.start_token, execution.end_token + 1  # type: ignore
            ):
                return id, execution
        return None

    @classmethod
    async def restart(cls) -> None:
        """Mark all stale running executions as FAILED and restart the schedules."""
        async with MySQLClient().lease() as sa_conn:
            update_execution_query = (
                update(ScanTestExecution)
                .where(
                    (ScanTestExecution.status == ScanTestStatus.QUEUED)
                    | (ScanTestExecution.status == ScanTestStatus.RUNNING)
                )
                .values(status=ScanTestStatus.FAILED, end_dt=datetime.utcnow())
            )
            await sa_conn.execute(update_execution_query)
            await sa_conn.connection.commit()

        # Start all of the schedules in the DB
        for row in await cls.list_schedules():
            test = ScanTest(row.network_name, row.type, row.mode, row.options)
            schedule = Schedule(row.enabled, row.cron_expr)
            cls._schedules[row.id] = schedule
            schedule.task = asyncio.create_task(schedule.start(test, row.params_id))

    @classmethod
    async def add_schedule(cls, schedule: Schedule, test: ScanTest) -> int:
        """Add a new schedule to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            insert_schedule_query = insert(ScanTestSchedule).values(
                enabled=schedule.enabled, cron_expr=schedule.cron_expr
            )
            schedule_row = await sa_conn.execute(insert_schedule_query)
            schedule_id: int = schedule_row.lastrowid

            insert_params_query = insert(ScanTestParams).values(
                schedule_id=schedule_id,
                network_name=test.network_name,
                type=test.type,
                mode=test.mode,
                options=test.options,
            )
            params_row = await sa_conn.execute(insert_params_query)
            params_id = params_row.lastrowid
            await sa_conn.connection.commit()

        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, params_id))
        return schedule_id

    @classmethod
    async def modify_schedule(
        cls, schedule_id: int, schedule: Schedule, test: ScanTest
    ) -> bool:
        """Stop the running schedule, update the DB, and restart."""
        async with MySQLClient().lease() as sa_conn:
            update_schedule_query = (
                update(ScanTestSchedule)
                .where(ScanTestSchedule.id == schedule_id)
                .values(enabled=schedule.enabled, cron_expr=schedule.cron_expr)
            )
            await sa_conn.execute(update_schedule_query)

            get_params_query = (
                select([ScanTestParams])
                .where(ScanTestParams.schedule_id == schedule_id)
                .order_by(ScanTestParams.id.desc())
                .limit(1)
            )
            cursor = await sa_conn.execute(get_params_query)
            params_row = await cursor.first()
            params_id = params_row.id

            # Insert new params row if the values differ
            if not (
                params_row.network_name == test.network_name
                and params_row.type == test.type
                and params_row.mode == test.mode
                and params_row.options == test.options
            ):
                insert_params_query = insert(ScanTestParams).values(
                    schedule_id=schedule_id,
                    network_name=test.network_name,
                    type=test.type,
                    mode=test.mode,
                    options=test.options,
                )
                params_row = await sa_conn.execute(insert_params_query)
                params_id = params_row.lastrowid

            await sa_conn.connection.commit()

        # Stop the existing schedule
        prev_schedule = cls._schedules[schedule_id]
        if not await prev_schedule.stop():
            return False

        # Start the new schedule
        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, params_id))
        return True

    @classmethod
    async def delete_schedule(cls, schedule_id: int) -> bool:
        """Stop the schedule and delete the entry from the DB."""
        async with MySQLClient().lease() as sa_conn:
            query = delete(ScanTestSchedule).where(ScanTestSchedule.id == schedule_id)
            await sa_conn.execute(query)
            await sa_conn.connection.commit()

        schedule = cls._schedules[schedule_id]
        if not await schedule.stop():
            return False

        del cls._schedules[schedule_id]
        return True

    @classmethod
    async def start_execution(
        cls, test: ScanTest, params_id: Optional[int] = None
    ) -> Optional[int]:
        """Add a new execution to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            if params_id is None:
                insert_params_query = insert(ScanTestParams).values(
                    network_name=test.network_name,
                    type=test.type,
                    mode=test.mode,
                    options=test.options,
                )
                params_row = await sa_conn.execute(insert_params_query)
                params_id = params_row.lastrowid

            insert_execution_query = insert(ScanTestExecution).values(
                params_id=params_id, status=ScanTestStatus.QUEUED
            )
            execution_row = await sa_conn.execute(insert_execution_query)
            execution_id: int = execution_row.lastrowid
            await sa_conn.connection.commit()

        # Start the test
        await test.start(execution_id, cls.SCAN_START_DELAY_S)

        if test.start_delay_s is None or test.end_delay_s is None:
            return None

        cls.executions[execution_id] = test

        # Schedule task for updating execution status to RUNNING
        loop = asyncio.get_event_loop()
        loop.call_later(
            test.start_delay_s,
            asyncio.create_task,
            cls.update_execution_status(execution_id, ScanTestStatus.RUNNING),
        )

        # Schedule task for updating execution status to FAILED
        loop.call_later(
            test.end_delay_s + cls.CLEAN_UP_DELAY_S,
            asyncio.create_task,
            cls.cleanup_execution_status(execution_id),
        )

        return execution_id

    @classmethod
    async def cleanup_execution_status(cls, execution_id: int) -> None:
        """If execution status is RUNNING, mark it as FAILED."""
        async with MySQLClient().lease() as sa_conn:
            get_execution_query = select([ScanTestExecution.status]).where(
                ScanTestExecution.id == execution_id
            )
            cursor = await sa_conn.execute(get_execution_query)
            execution_row = await cursor.first()
        if execution_row and execution_row.status == ScanTestStatus.RUNNING:
            await cls.update_execution_status(execution_id, ScanTestStatus.FAILED)

    @classmethod
    async def update_execution_status(
        cls, execution_id: int, status: Enum, end_dt: Optional[datetime] = None
    ) -> None:
        """Update status of scan execution."""
        logging.info(f"Updating execution status for id {execution_id} to {status}")
        async with MySQLClient().lease() as sa_conn:
            update_execution_query = (
                update(ScanTestExecution)
                .where(ScanTestExecution.id == execution_id)
                .values(status=status, end_dt=end_dt)
            )
            await sa_conn.execute(update_execution_query)
            await sa_conn.connection.commit()

    @staticmethod
    async def describe_schedule(
        schedule_id: int,
    ) -> Optional[Tuple[Iterable, Iterable]]:
        """Fetch a particular schedule and its execution history given the ID."""
        async with MySQLClient().lease() as sa_conn:
            get_schedule_query = select([ScanTestSchedule]).where(
                ScanTestSchedule.id == schedule_id
            )
            cursor = await sa_conn.execute(get_schedule_query)
            schedule = await cursor.first()
            if not schedule:
                return None

            get_executions_query = select(
                [
                    ScanTestParams.network_name,
                    ScanTestParams.type,
                    ScanTestParams.mode,
                    ScanTestParams.options,
                    ScanTestExecution,
                ]
            ).select_from(
                join(
                    join(
                        ScanTestParams,
                        ScanTestSchedule,
                        ScanTestParams.schedule_id == ScanTestSchedule.id,
                    ),
                    ScanTestExecution,
                    ScanTestExecution.params_id == ScanTestParams.id,
                )
            )
            cursor = await sa_conn.execute(get_executions_query)
            return schedule, await cursor.fetchall()

    @staticmethod
    async def list_schedules(
        network_name: Optional[str] = None,
        type: Optional[ScanType] = None,
        mode: Optional[ScanMode] = None,
    ) -> Iterable:
        """Fetch all the schedules, or a subset, with optional filtering."""
        async with MySQLClient().lease() as sa_conn:
            query = (
                select(
                    [
                        ScanTestSchedule,
                        ScanTestParams.id.label("params_id"),
                        ScanTestParams.network_name,
                        ScanTestParams.type,
                        ScanTestParams.mode,
                        ScanTestParams.options,
                    ]
                )
                .select_from(
                    join(
                        ScanTestParams,
                        ScanTestSchedule,
                        ScanTestParams.schedule_id == ScanTestSchedule.id,
                    )
                )
                .where(
                    ScanTestParams.id.in_(
                        select([func.max(ScanTestParams.id)]).group_by(
                            ScanTestParams.schedule_id
                        )
                    )
                )
            )

            # Add filter conditions
            if network_name is not None:
                query = query.where(ScanTestParams.network_name == network_name)
            if type is not None:
                query = query.where(ScanTestParams.type == type)
            if mode is not None:
                query = query.where(ScanTestParams.mode == mode)

            cursor = await sa_conn.execute(query)
            schedules: Iterable = await cursor.fetchall()
            return schedules

    @staticmethod
    async def describe_execution(
        execution_id: int,
    ) -> Optional[Tuple[Iterable, Iterable, Iterable, Iterable]]:
        """Fetch a particular execution given the ID."""
        async with MySQLClient().lease() as sa_conn:
            get_execution_query = (
                select(
                    [
                        ScanTestExecution,
                        ScanTestParams.network_name,
                        ScanTestParams.type,
                        ScanTestParams.mode,
                        ScanTestParams.options,
                    ]
                )
                .select_from(
                    join(
                        ScanTestExecution,
                        ScanTestParams,
                        ScanTestExecution.params_id == ScanTestParams.id,
                    )
                )
                .where(ScanTestExecution.id == execution_id)
            )
            cursor = await sa_conn.execute(get_execution_query)
            execution = await cursor.first()
            if not execution:
                return None

            ignore_cols = {"id", "execution_id", "type", "mode", "results_path"}

            get_results_query = select(
                filter(
                    lambda col: col.key not in ignore_cols,
                    ScanResults.__table__.columns,
                )
            ).where(ScanResults.execution_id == execution_id)
            cursor = await sa_conn.execute(get_results_query)
            results = await cursor.fetchall()

            get_connectivity_results_query = select(
                filter(
                    lambda col: col.key not in ignore_cols,
                    ConnectivityResults.__table__.columns,
                )
            ).where(ConnectivityResults.execution_id == execution_id)
            cursor = await sa_conn.execute(get_connectivity_results_query)
            connectivity_results = await cursor.fetchall()

            get_interference_results_query = select(
                filter(
                    lambda col: col.key not in ignore_cols,
                    InterferenceResults.__table__.columns,
                )
            ).where(InterferenceResults.execution_id == execution_id)
            cursor = await sa_conn.execute(get_interference_results_query)
            return execution, results, connectivity_results, await cursor.fetchall()

    @staticmethod
    async def list_executions(
        network_name: Optional[str] = None,
        type: Optional[ScanType] = None,
        mode: Optional[ScanMode] = None,
        status: Optional[ScanTestStatus] = None,
        start_dt: Optional[datetime] = None,
    ) -> Iterable:
        """Fetch all the executions, or a subset, with optional filtering."""
        async with MySQLClient().lease() as sa_conn:
            query = select(
                [
                    ScanTestExecution,
                    ScanTestParams.network_name,
                    ScanTestParams.type,
                    ScanTestParams.mode,
                    ScanTestParams.options,
                ]
            ).select_from(
                join(
                    ScanTestExecution,
                    ScanTestParams,
                    ScanTestExecution.params_id == ScanTestParams.id,
                )
            )

            # Add filter conditions
            if network_name is not None:
                query = query.where(ScanTestParams.network_name == network_name)
            if type is not None:
                query = query.where(ScanTestParams.type == type)
            if mode is not None:
                query = query.where(ScanTestParams.mode == mode)
            if status is not None:
                query = query.where(ScanTestExecution.status == status)
            if start_dt is not None:
                query = query.where(ScanTestExecution.start_dt >= start_dt)

            cursor = await sa_conn.execute(query)
            executions: Iterable = await cursor.fetchall()
            return executions
