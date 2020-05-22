#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import dataclasses
import json
import logging
import sys
import time
from typing import Any, Dict, NoReturn

from tglib import ClientType, init

from . import jobs


@dataclasses.dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time_ms: int
    params: Dict


async def produce(
    queue: asyncio.Queue, name: str, pipeline: Dict[str, Any]
) -> NoReturn:
    """Add jobs from the pipeline configuration to the shared queue."""
    while True:
        start_time = time.time()

        tasks = [
            queue.put(
                Job(
                    name=job["name"],
                    start_time_ms=int(round(start_time * 1e3)),
                    params=job.get("params", {}),
                )
            )
            for job in pipeline.get("jobs", [])
            if job.get("enabled", False)
        ]

        # Add the jobs to the queue
        await asyncio.gather(*tasks)

        # Sleep until next invocation period
        sleep_time = start_time + pipeline["period_s"] - time.time()

        logging.info(
            f"Done enqueuing jobs in the '{name}' pipeline. "
            f"Added {len(tasks)} job(s) to the queue. Sleeping for {sleep_time:0.2f}s"
        )

        await asyncio.sleep(sleep_time)


async def consume(queue: asyncio.Queue) -> NoReturn:
    """Consume and run a job from the shared queue."""
    while True:
        # Wait for a job from the producers
        job = await queue.get()
        logging.info(f"Starting the '{job.name}' job")

        # Execute the job
        function = getattr(jobs, job.name)
        await function(job.start_time_ms, **job.params)
        logging.info(f"Finished running the '{job.name}' job")


async def async_main(config: Dict[str, Any]) -> None:
    logging.info("#### Starting the 'analytics' service ####")
    logging.debug(f"service config: {config}")

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
        with open("./service_config.json") as f:
            config = json.load(f)
    except (json.JSONDecodeError, OSError):
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(
        lambda: async_main(config),
        {ClientType.API_SERVICE_CLIENT, ClientType.PROMETHEUS_CLIENT},
    )
