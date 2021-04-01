#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import time
from contextlib import suppress
from datetime import datetime
from typing import Any, Dict, Iterable, List, NoReturn, Optional, Set, Tuple

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
from .stats import (
    compute_iperf_stats,
    compute_link_health,
    compute_node_health,
    fetch_link_stats,
    fetch_node_stats,
    parse_msg,
)
from .suites import (
    BaseTest,
    LinkTest,
    NodeTest,
    ParallelLinkTest,
    ParallelNodeTest,
    SequentialLinkTest,
    SequentialNodeTest,
)


class Schedule:
    def __init__(self, enabled: bool, cron_expr: str) -> None:
        self.enabled = enabled
        self.cron_expr = cron_expr
        self.task: Optional[asyncio.Task] = None

    async def start(self, test: BaseTest, params_id: int) -> NoReturn:
        """Start the schedule task.

        Loops forever and tries to start a new test execution when the cron
        expression is evaluated.
        """
        iter = croniter(self.cron_expr, datetime.now())

        while True:
            logging.info(
                f"A {test.test_type.value} test is scheduled for "
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
            if not await test.prepare():
                logging.error("Failed to prepare network test assets")
                continue

            # Start the test if all the "skip checks" are negative
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
    async def process_msg(cls, msg: str) -> None:
        """Process the kafka message and extract relevant network test stats."""
        parsed = parse_msg(msg)
        if parsed is None:
            return

        execution_id, test = None, None
        for _execution_id, _test in cls._executions.items():
            if parsed.session_id in _test.session_ids:
                execution_id = _execution_id
                test = _test
                break
        if execution_id is None:
            logging.warning(f"Session '{parsed.session_id}' has no matching execution")
            return

        values: Dict[str, Any] = {}
        async with MySQLClient().lease() as sa_conn:
            if "error" in parsed.output or not parsed.output["intervals"]:
                values["status"] = NetworkTestStatus.FAILED
            else:
                values["status"] = NetworkTestStatus.FINISHED
                values.update(compute_iperf_stats(parsed))
                if not parsed.is_server:
                    values["iperf_client_blob"] = msg
                else:
                    values["iperf_server_blob"] = msg

                    get_results_query = select(
                        [NetworkTestResult.start_dt, NetworkTestResult.asset_name]
                    ).where(
                        (NetworkTestResult.execution_id == execution_id)
                        & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                        & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
                    )
                    cursor = await sa_conn.execute(get_results_query)
                    row = await cursor.first()

                    if isinstance(test, NodeTest):
                        values.update(
                            await fetch_node_stats(
                                start_dt=row.start_dt,
                                session_duration=test.iperf_options["timeSec"],
                                network_name=test.network_name,
                                node_name=row.asset_name,
                            )
                        )
                        values["health"] = compute_node_health(
                            expected_bitrate=test.iperf_options["bitrate"],
                            iperf_avg_throughput=values["iperf_avg_throughput"],
                        )
                    elif isinstance(test, LinkTest):
                        link_stats_output = await fetch_link_stats(
                            start_dt=row.start_dt,
                            session_duration=test.iperf_options["timeSec"],
                            network_name=test.network_name,
                            link_name=row.asset_name,
                            src_node_mac=parsed.src_node_id,
                            dst_node_mac=parsed.dst_node_id,
                        )

                        if link_stats_output is not None:
                            firmware_stats, health_stats = link_stats_output
                            values.update(firmware_stats)
                            values["health"] = compute_link_health(
                                expected_bitrate=test.iperf_options["bitrate"],
                                iperf_avg_throughput=values["iperf_avg_throughput"],
                                **health_stats,
                            )

            update_results_query = (
                update(NetworkTestResult)
                .where(
                    (NetworkTestResult.execution_id == execution_id)
                    & (NetworkTestResult.src_node_mac == parsed.src_node_id)
                    & (NetworkTestResult.dst_node_mac == parsed.dst_node_id)
                )
                .values(**values)
            )

            await sa_conn.execute(update_results_query)
            await sa_conn.connection.commit()

    @classmethod
    async def restart(cls) -> None:
        """Clean up any stray sessions and restart the schedules in the DB."""
        # Stop all stale running tests
        coros: List[asyncio.Future] = []
        client = APIServiceClient(timeout=1)
        statuses = await client.request_all("statusTraffic", return_exceptions=True)
        for network_name, sessions in statuses.items():
            if isinstance(sessions, ClientRuntimeError):
                logging.error(f"Failed to get iperf traffic status for {network_name}")
                continue
            session_ids = sessions.get("sessions")
            if session_ids is None:
                continue

            coros += [
                client.request(network_name, "stopTraffic", params={"id": id})
                for id in session_ids
            ]
        await asyncio.gather(*coros, return_exceptions=True)

        # Update stale executions/results
        async with MySQLClient().lease() as sa_conn:
            # Mark all stale RUNNING executions as FAILED
            update_running_execution_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.status == NetworkTestStatus.RUNNING)
                .values(status=NetworkTestStatus.FAILED)
            )
            await sa_conn.execute(update_running_execution_query)

            # Mark all stale RUNNING/PROCESSING results as FAILED
            update_results_query = (
                update(NetworkTestResult)
                .where(
                    (NetworkTestResult.status == NetworkTestStatus.RUNNING)
                    | (NetworkTestResult.status == NetworkTestStatus.PROCESSING)
                )
                .values(status=NetworkTestStatus.FAILED)
            )
            await sa_conn.execute(update_results_query)

            # Mark all stale PROCESSING executions as FINISHED/FAILED
            get_processing_executions_query = (
                select([NetworkTestExecution.id])
                .select_from(
                    join(
                        NetworkTestResult,
                        NetworkTestExecution,
                        NetworkTestResult.execution_id == NetworkTestExecution.id,
                    )
                )
                .where(
                    (NetworkTestExecution.status == NetworkTestStatus.PROCESSING)
                    & (NetworkTestResult.status == NetworkTestStatus.FINISHED)
                )
                .group_by(NetworkTestExecution.id)
            )
            cursor = await sa_conn.execute(get_processing_executions_query)
            executions = [execution.id for execution in await cursor.fetchall()]

            update_finished_executions_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.id.in_(executions))
                .values(status=NetworkTestStatus.FINISHED)
            )
            await sa_conn.execute(update_finished_executions_query)
            update_failed_executions_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.status == NetworkTestStatus.PROCESSING)
                .values(status=NetworkTestStatus.FAILED)
            )
            await sa_conn.execute(update_failed_executions_query)
            await sa_conn.connection.commit()

        # Start all of the schedules in the DB
        for row in await cls.list_schedules():
            test: BaseTest
            if row.test_type == NetworkTestType.PARALLEL_LINK:
                test = ParallelLinkTest(
                    row.network_name, row.iperf_options, row.allowlist
                )
            elif row.test_type == NetworkTestType.PARALLEL_NODE:
                test = ParallelNodeTest(
                    row.network_name, row.iperf_options, row.allowlist
                )
            elif row.test_type == NetworkTestType.SEQUENTIAL_LINK:
                test = SequentialLinkTest(
                    row.network_name, row.iperf_options, row.allowlist
                )
            elif row.test_type == NetworkTestType.SEQUENTIAL_NODE:
                test = SequentialNodeTest(
                    row.network_name, row.iperf_options, row.allowlist
                )

            schedule = Schedule(row.enabled, row.cron_expr)
            cls._schedules[row.id] = schedule
            schedule.task = asyncio.create_task(schedule.start(test, row.params_id))

    @classmethod
    async def add_schedule(cls, schedule: Schedule, test: BaseTest) -> int:
        """Add a new schedule to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            insert_schedule_query = insert(NetworkTestSchedule).values(
                enabled=schedule.enabled, cron_expr=schedule.cron_expr
            )
            schedule_row = await sa_conn.execute(insert_schedule_query)
            schedule_id = schedule_row.lastrowid

            insert_params_query = insert(NetworkTestParams).values(
                schedule_id=schedule_id,
                test_type=test.test_type,
                network_name=test.network_name,
                iperf_options=test.iperf_options,
                allowlist=test.allowlist or None,
            )
            params_row = await sa_conn.execute(insert_params_query)
            params_id = params_row.lastrowid
            await sa_conn.connection.commit()

        cls._schedules[schedule_id] = schedule
        schedule.task = asyncio.create_task(schedule.start(test, params_id))
        return schedule_id

    @classmethod
    async def modify_schedule(
        cls,
        schedule_id: int,
        enabled: bool,
        cron_expr: str,
        network_name: str,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
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
            if params_row.test_type == NetworkTestType.PARALLEL_LINK:
                test = ParallelLinkTest(network_name, iperf_options, allowlist)
            elif params_row.test_type == NetworkTestType.PARALLEL_NODE:
                test = ParallelNodeTest(network_name, iperf_options, allowlist)
            elif params_row.test_type == NetworkTestType.SEQUENTIAL_LINK:
                test = SequentialLinkTest(network_name, iperf_options, allowlist)
            elif params_row.test_type == NetworkTestType.SEQUENTIAL_NODE:
                test = SequentialNodeTest(network_name, iperf_options, allowlist)

            # Insert new params row if the values differ
            if not (
                params_row.network_name == test.network_name
                and params_row.iperf_options == test.iperf_options
                and set(params_row.allowlist or []) == set(test.allowlist)
            ):
                insert_params_query = insert(NetworkTestParams).values(
                    schedule_id=schedule_id,
                    test_type=params_row.test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
                    allowlist=test.allowlist or None,
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
        schedule.task = asyncio.create_task(schedule.start(test, params_id))
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
        cls, test: BaseTest, params_id: Optional[int] = None
    ) -> int:
        """Add a new execution to the DB and start the internal task."""
        async with MySQLClient().lease() as sa_conn:
            if params_id is None:
                insert_params_query = insert(NetworkTestParams).values(
                    test_type=test.test_type,
                    network_name=test.network_name,
                    iperf_options=test.iperf_options,
                    allowlist=test.allowlist or None,
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
        test.task = asyncio.create_task(
            test.start(execution_id, use_link_local=isinstance(test, LinkTest))
        )

        # Schedule the cleanup task
        loop = asyncio.get_event_loop()
        test.cleanup_handle = loop.call_later(
            test.estimate_duration().total_seconds(),
            asyncio.create_task,
            cls.stop_execution(execution_id, manual=False),
        )

        return execution_id

    @classmethod
    async def stop_execution(cls, execution_id: int, manual: bool = True) -> bool:
        """Stop the execution and update the DB accordingly.

        This logic can be invoked manually via the HTTP API or via the cleanup task.
        The method marks sessions and tests as ABORTED if invoked from the API and
        FAILED/FINISHED if invoked from the cleanup task.

        In addition, tests that are stopped via the cleanup task are temporarily
        marked as PROCESSING for a duration of 'processing_timeout_s' in order to
        allow for time to process the results off the Kafka stream and to free the
        network for future tests.
        """
        status = NetworkTestStatus.ABORTED if manual else NetworkTestStatus.PROCESSING
        async with MySQLClient().lease() as sa_conn:
            update_execution_query = (
                update(NetworkTestExecution)
                .where(NetworkTestExecution.id == execution_id)
                .values(status=status)
            )
            await sa_conn.execute(update_execution_query)

            update_result_query = (
                update(NetworkTestResult)
                .where(
                    (NetworkTestResult.execution_id == execution_id)
                    & (NetworkTestResult.status == NetworkTestStatus.RUNNING)
                )
                .values(status=status)
            )
            await sa_conn.execute(update_result_query)
            await sa_conn.connection.commit()

        test = cls._executions[execution_id]
        if not manual:
            # Sleep for the processing timeout duration
            await asyncio.sleep(cls.timeout)

            async with MySQLClient().lease() as sa_conn:
                update_result_query = (
                    update(NetworkTestResult)
                    .where(
                        (NetworkTestResult.execution_id == execution_id)
                        & (NetworkTestResult.status == NetworkTestStatus.PROCESSING)
                    )
                    .values(status=NetworkTestStatus.FAILED)
                )
                result = await sa_conn.execute(update_result_query)

                # Mark the entire execution as FINISHED if at least one session completed
                update_execution_query = (
                    update(NetworkTestExecution)
                    .where(NetworkTestExecution.id == execution_id)
                    .values(
                        status=(
                            NetworkTestStatus.FAILED
                            if not test.session_ids
                            or result.rowcount == len(test.session_ids)
                            else NetworkTestStatus.FINISHED
                        )
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
                    NetworkTestParams.allowlist,
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
        test_type: Optional[Set[NetworkTestType]] = None,
        network_name: Optional[str] = None,
        protocol: Optional[Set[int]] = None,
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
                        NetworkTestParams.allowlist,
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
                query = query.where(NetworkTestParams.test_type.in_(test_type))
            if network_name is not None:
                query = query.where(NetworkTestParams.network_name == network_name)
            if protocol is not None:
                query = query.where(
                    NetworkTestParams.iperf_options["protocol"].in_(protocol)
                )
            if partial is not None:
                if partial:
                    query = query.where(NetworkTestParams.allowlist.isnot(None))
                else:
                    query = query.where(NetworkTestParams.allowlist.is_(None))

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
                        NetworkTestParams.allowlist,
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
        test_type: Optional[Set[NetworkTestType]] = None,
        network_name: Optional[str] = None,
        protocol: Optional[Set[int]] = None,
        partial: Optional[bool] = None,
        status: Optional[Set[NetworkTestStatus]] = None,
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
                    NetworkTestParams.allowlist,
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
                query = query.where(NetworkTestParams.test_type.in_(test_type))
            if network_name is not None:
                query = query.where(NetworkTestParams.network_name == network_name)
            if protocol is not None:
                query = query.where(
                    NetworkTestParams.iperf_options["protocol"].in_(protocol)
                )
            if partial is not None:
                if partial:
                    query = query.where(NetworkTestParams.allowlist.isnot(None))
                else:
                    query = query.where(NetworkTestParams.allowlist.is_(None))
            if status is not None:
                query = query.where(NetworkTestExecution.status.in_(status))
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
