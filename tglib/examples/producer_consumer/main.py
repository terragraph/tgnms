#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
This example shows how to design a simple producer-consumer scheduler around
the tglib framework. The 'async_main' function creates a shared asyncio queue
and passes it to the 'produce' and 'consume' coroutines.

The 'produce' coroutine reads the pipeline configuration and adds jobs with the
associated configuration to the shared queue. A 'Job' here is a function whose
definition is written in the 'jobs' module. Once all the jobs in the pipeline
are added, the coroutine sleeps until the next processing period.

The 'consume' coroutine pops a job off the queue and runs it from 'jobs'.
"""

import asyncio
import dataclasses
import json
import logging
import sys
import time
from typing import Dict

from tglib import ClientType, init

from . import jobs


@dataclasses.dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time: int
    params: Dict


async def produce(queue: asyncio.Queue, name: str, pipeline: Dict) -> None:
    """Add jobs from the pipeline configuration to the shared queue."""
    while True:
        start_time = time.time()

        tasks = [
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
        await asyncio.gather(*tasks)

        # Sleep until next invocation period
        sleep_time = start_time + pipeline["period"] - time.time()

        logging.info(
            f"Done enqueuing jobs in the '{name}' pipeline. "
            f"Added {len(tasks)} job(s) to the queue. Sleeping for {sleep_time}s"
        )

        await asyncio.sleep(sleep_time)


async def consume(queue: asyncio.Queue) -> None:
    """Consume and run a job from the shared queue."""
    while True:
        # Wait for a job from the producers
        job = await queue.get()
        logging.info(f"Starting the '{job.name}' job")

        # Execute the job
        function = getattr(jobs, job.name)
        await function(job.start_time, **job.params)
        logging.info(f"Finished running the '{job.name}' job")


async def async_main(config: Dict) -> None:
    """Start the producer and consumer coroutines."""
    q: asyncio.Queue = asyncio.Queue()

    # Create producer coroutines
    producers = [
        produce(q, name, pipeline) for name, pipeline in config["pipelines"].items()
    ]

    # Create the consumer coroutines
    consumers = [consume(q) for _ in range(config["num_consumers"])]

    # Start the producer and consumer coroutines
    await asyncio.gather(*producers, *consumers)


def main() -> None:
    """Pass in the 'async_main' function and a set of clients into 'init'."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(lambda: async_main(config), {ClientType.PROMETHEUS_CLIENT})
