#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""Entry point for starting periodic analytics pipelines.

This module provides the main function for starting the analytics pipelines.
None of the functions provided should be used outside the scope of the module.

Attributes:
    Job
"""

import argparse
import asyncio
import dataclasses
import json
import logging
import os
import sys
import time
from typing import Dict, List, NoReturn

import module.insights
from module.http_client import get_shared_session
from module.mysql_connection_pool import get_shared_pool


parser = argparse.ArgumentParser()
parser.add_argument(
    "-ncon",
    "--num-consumers",
    type=int,
    default=10,
    help="number of consumer coroutines to start",
)
parser.add_argument(
    "-p",
    "--pipeline-config-file",
    type=str,
    default="/usr/local/analytics/config/PipelineConfig.json",
    help="location of the pipeline configuration file",
)
parser.add_argument(
    "-v",
    "--verbosity",
    type=str,
    default="INFO",
    help="python's logging module verbosity level",
    choices=("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"),
)
args = parser.parse_args()


@dataclasses.dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time: int
    params: Dict


async def _consume(queue: asyncio.Queue) -> NoReturn:
    """Consume and run a job from the shared queue.

    Pop a job off the queue and run it with the parameters from module.insights.

    Args:
        queue: A shared queue of jobs.
    """

    while True:
        # Wait for a job from the producers
        job = await queue.get()
        logging.info(f"Starting the {job.name} job")

        # Execute the job
        function = getattr(module.insights, job.name)
        await function(job.start_time, **job.params)
        logging.info(f"Finished running the {job.name} job")


async def _produce(queue: asyncio.Queue, name: str, pipeline: Dict) -> NoReturn:
    """Add jobs in the given pipeline configuration to the shared queue.

    Reads the pipeline configuration and adds jobs to the shared queue with the
    associated configuration for consumption/processing. Once all the jobs in
    the configuration are added, sleep until the next processing period.

    Args:
        queue: A shared queue of jobs.
        name: Pipeline name.
        pipeline: Dictionary of pipeline configurations.
    """

    while True:
        logging.info(f"Enqueuing jobs in the '{name}' pipeline")
        start_time = time.time()

        jobs = [
            queue.put(
                Job(
                    name=job["name"],
                    start_time=int(start_time),
                    params=job.get("params", {}),
                )
            )
            for job in pipeline.get("jobs", [])
            if job.get("enabled", False)
        ]

        # Add the jobs to the queue
        await asyncio.gather(*jobs)

        # Sleep until next invocation period
        sleep_time = start_time + pipeline["period"] - time.time()

        logging.info(
            f"Done enqueuing jobs in the '{name}' pipeline. "
            f"Added {len(jobs)} jobs to the queue. Sleeping for {sleep_time}s"
        )

        await asyncio.sleep(sleep_time)


async def _main(pipeline_config: Dict) -> NoReturn:
    """Start the producer and consumer coroutines.

    Args:
        pipeline_config: Dictionary of configuration options used for creating
        the producer coroutines.
    """

    host = os.getenv("MYSQL_HOST")
    if host is None:
        raise ValueError("Missing 'MYSQL_HOST' environment variable")

    user = os.getenv("MYSQL_USER")
    if user is None:
        raise ValueError("Missing 'MYSQL_USER' environment variable")

    password = os.getenv("MYSQL_PASS")
    if password is None:
        raise ValueError("Missing 'MYSQL_PASS' environment variable")

    try:
        # Create singleton HTTP session pool and MySQL connection pool
        async with get_shared_session(), get_shared_pool(
            host=host, port=3306, user=user, password=password, db="cxl"
        ):
            # Create shared job queue
            q = asyncio.Queue()

            # Create producer coroutines
            producers = [
                _produce(q, name, pipeline)
                for name, pipeline in pipeline_config.items()
            ]

            # Create consumer coroutines
            consumers = [_consume(q) for n in range(args.num_consumers)]

            # Start the producer and consumer coroutines
            await asyncio.gather(*producers, *consumers)
    except Exception:
        logging.exception("Analytics event loop failed for unknown reason")


if __name__ == "__main__":
    logging.basicConfig(
        format="%(levelname)s %(asctime)s %(filename)s:%(lineno)d] %(message)s",
        level=logging.getLevelName(args.verbosity),
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    try:
        with open(args.pipeline_config_file) as config_file:
            pipeline_config = json.load(config_file)
    except OSError:
        logging.exception("Failed to parse pipeline configuration file")
        sys.exit(1)

    asyncio.run(_main(pipeline_config))
