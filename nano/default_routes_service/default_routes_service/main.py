#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import json
import logging
import sys
import time
from dataclasses import dataclass
from typing import Dict, List

from tglib import ClientType, init

from . import jobs
from .routes import routes
from .utils import DRS, get_default_routes_service_objs


@dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time: int
    params: Dict


async def produce(queue: asyncio.Queue, name: str, pipeline: Dict) -> None:
    """Add default routes service jobs to the shared queue."""
    # restrict pipeline frequency to reduce load on E2E server
    if pipeline["period"] < 60:
        raise ValueError("Pipeline's 'period' cannot be less than 60 seconds.")

    while True:
        start_time = time.time()

        # get all topologies and default routes for all nodes
        drs_objs: List[DRS] = await get_default_routes_service_objs()

        tasks = [
            queue.put(
                Job(
                    name=job["name"],
                    start_time=int(start_time),
                    params={**job.get("params", {}), "drs_objs": drs_objs},
                )
            )
            for job in pipeline.get("jobs", [])
            if job.get("enabled", False)
        ]

        # add jobs to the queue
        await asyncio.gather(*tasks)

        # sleep until next invocation time
        sleep_time = start_time + pipeline["period"] - time.time()
        logging.info(
            f"Done enqueuing jobs in the '{name}' pipeline. "
            f"Added {len(tasks)} job(s) to the queue. Sleeping for {sleep_time}s"
        )
        await asyncio.sleep(sleep_time)


async def consume(queue: asyncio.Queue) -> None:
    """Consume and run a job from the shared queue."""
    while True:
        # wait for a job from producers
        job: Job = await queue.get()
        logging.info(f"Starting the {job.name} job.")

        # execute the job
        function = getattr(jobs, job.name)
        await function(job.start_time, **job.params)
        logging.info(f"Finished running the {job.name} job.")


async def async_main(config: Dict) -> None:
    """Start producer and consumer coroutines."""
    logging.info("#### Starting default routes service ####")
    logging.debug(f"Service config: {config}")

    queue: asyncio.Queue = asyncio.Queue()

    # create producer coroutines
    producers = [
        produce(queue, name, pipeline) for name, pipeline in config["pipelines"].items()
    ]

    # create consumer coroutines
    consumers = [consume(queue) for _ in range(config["num_consumers"])]

    # start the producer and consumer coroutines
    await asyncio.gather(*producers, *consumers)


def main() -> None:
    try:
        with open("./service_config.json") as file:
            config = json.load(file)
    except (json.JSONDecodeError, OSError):
        logging.exception(f"Failed to parse service configuration file.")
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
