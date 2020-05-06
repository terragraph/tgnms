#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import json
import logging
import sys
import time
from typing import Dict

from tglib import ClientType, init

from . import jobs
from .routes import routes


@dataclasses.dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time: int
    window_s: int
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
                    window_s=job["window_s"],
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
        await function(job.start_time, job.window_s, **job.params)
        logging.info(f"Finished running the '{job.name}' job")


async def async_main(config: Dict) -> None:
    logging.info("#### Starting the 'Cut Edge Optimizer' ####")
    logging.debug(f"Found service config: {config}")

    q: asyncio.Queue = asyncio.Queue()

    # Create producer coroutines
    producers = [
        produce(q, name, pipeline) for name, pipeline in config["pipelines"].items()
    ]

    # Create consumer coroutines
    consumers = [consume(q) for _ in range(config["num_consumers"])]

    # Start the producer and consumer coroutines
    await asyncio.gather(*producers, *consumers)


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {
            ClientType.API_SERVICE_CLIENT,
            ClientType.MYSQL_CLIENT,
            ClientType.PROMETHEUS_CLIENT,
        },
        routes,
    )
