.. currentmodule:: tglib

==============
Advanced Usage
==============

A common property of many of our microservices is the need to run logic on simple
periods or intervals (i.e. every 24h, 1h, 5min, etc). The following examples show how
to design a simple producer/consumer scheduler using :mod:`tglib` and :mod:`asyncio`.

Prometheus Bumper
=================

The Prometheus Bumper is a simple service that reads timeseries metrics using the
:class:`~.PrometheusClient`, bumps the values by some user-specified input, and writes
the new metrics back to Prometheus. As with the :ref:`basic example <tglib-quickstart>`,
let's start by defining the service configuration.

In the producer/consumer model, we will use pipeline definitions in a service’s
configuration file to periodically push, or *produce*, jobs to a shared
:class:`asyncio.Queue` to be run, or *consumed*. In this example, there is a single
pipeline definition that describes one job, ``add_x``, to be run every 300 seconds.

.. code-block:: json

    {
        "num_consumers": 5,
        "pipelines": {
            "test_pipeline": {
                "period": 300,
                "jobs": [
                    {
                        "name": "add_x",
                        "enabled": true,
                        "params": {
                            "metric_name": "foo",
                            "x": 5
                        }
                    }
                ]
            }
        }
    }

In the entrypoint for the service, we will create a ``produce`` coroutine for each
pipeline and a number of ``consume`` coroutines according to the ``num_consumers``
field in the service configuration.

.. code-block:: python

    # main.py

    import asyncio
    import json
    from typing import Dict

    from tglib import ClientType, init


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


    if __name__ == "__main__":
        """Pass in the 'async_main' function and a set of clients into 'init'."""
        with open("./service_config.json") as f:
            config = json.load(f)

        init(lambda: async_main(config), {ClientType.PROMETHEUS_CLIENT})

Each ``produce`` coroutine creates a ``Job`` object for each job in its configuration
and pushes them all to the shared queue. The producer then sleeps until it’s time to
kick off the jobs again.

.. code-block:: python

    # main.py

    import dataclasses
    from typing import Dict, NoReturn


    @dataclasses.dataclass
    class Job:
        """Struct for representing pipeline job configurations."""

        name: str
        start_time_ms: int
        params: Dict


    async def produce(queue: asyncio.Queue, name: str, pipeline: Dict) -> NoReturn:
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
            sleep_time = start_time + pipeline["period"] - time.time()

            print(
                f"Done enqueuing jobs in '{name}'. "
                f"Added {len(tasks)} job(s) to the queue. Sleeping for {sleep_time}s"
            )

            await asyncio.sleep(sleep_time)

Meanwhile, the ``consume`` coroutines wait for jobs to be pushed to the queue and run
them once available.

.. code-block:: python

    # main.py

    import jobs


    async def consume(queue: asyncio.Queue) -> NoReturn:
        """Consume and run a job from the shared queue."""
        while True:
            # Wait for a job from the producers
            job = await queue.get()
            print(f"Starting the '{job.name}' job")

            # Execute the job
            function = getattr(jobs, job.name)
            await function(job.start_time, **job.params)
            print(f"Finished running the '{job.name}' job")

All the jobs are defined in a separate module called ``jobs.py`` and their function
signatures correspond directly to the names and parameters specified in the service
configuration file. The job below very simply reads in the latest values of
``metric_name`` and writes them back to Prometheus with the value ``x`` added.

.. code-block:: python

    # jobs.py

    from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric

    async def add_x(start_time_ms: int, metric_name: str, x: int) -> None:
        """Add 'x' to the latest value of 'metric_name'.

        Write the derived stat back to Prometheus using the same labels.
        """
        client = PrometheusClient(timeout=2)
        query = client.format_query(metric_name)
        response = await client.query_latest(query)
        if response["status"] != "success":
            return

        metrics: List[PrometheusMetric] = []
        for result in response["data"]["result"]:
            name = f"{metric_name}_plus_{x}"
            labels = result["metric"]
            value = result["value"][1] + x
            metrics.append(PrometheusMetric(name, labels, value, start_time_ms))

        client.write_metrics(metrics)

Topology Fetcher
================

This next example will use the producer/consumer model introduced above to construct a
service which periodically fetches the latest topology using the
:class:`~.APIServiceClient` and writes the results to the database using the
:class:`~.MySQLClient`. In addition, this example will show how use the optional third
parameter to the :func:`~.init` function to add additional routes to the webserver.

First, let's define a simplified table schema for our ``Topology`` table using
:mod:`sqlalchemy`.

.. code-block:: python

    # models.py

    from sqlalchemy import JSON, Column, DateTime, Integer, String
    from sqlalchemy.ext.declarative import declarative_base

    Base = declarative_base()

    class Topology(Base):
        __tablename__ = "topology"

        id = Column(Integer, primary_key=True)
        network_name = Column(String(255), nullable=False)
        topology = Column(JSON, nullable=False)
        last_updated = Column(DateTime, nullable=False)

The ``save_topology`` job is defined below.

.. code-block:: python

    # jobs.py

    from datetime import datetime

    from sqlalchemy import insert
    from tglib.clients import APIServiceClient, MySQLClient

    from .models import Topology

    async def save_topology(start_time_ms: int) -> None:
        results = await APIServiceClient(timeout=1).request_all("getTopology")
        last_updated = datetime.utcfromtimestamp(start_time_ms / 1e3)
        values = [
            {
                "network_name": network_name,
                "topology": topology,
                "last_updated": last_updated,
            }
            for network_name, topology in results.items()
        ]

        query = insert(Topology).values(values)
        async with MySQLClient().lease() as sa_conn:
            await sa_conn.execute(query)
            await sa_conn.connection.commit()

Now, we would like to define an additional HTTP endpoint for fetching the topology
information.

.. code-block:: python

    # routes.py

    import json
    from datetime import datetime
    from functools import partial

    from aiohttp import web
    from sqlalchemy import select
    from tglib.clients import MySQLClient

    from .models import Topology


    routes = web.RouteTableDef()


    def custom_serializer(obj) -> str:
        if isinstance(obj, datetime):
            return datetime.isoformat(obj)
        else:
            return str(obj)


    @routes.get("/topology")
    async def handle_get_topology(request: web.Request) -> web.Response:
        start_dt = request.rel_url.query.get("start_dt")

        # Parse start_dt, raise '400' if missing/invalid
        if start_dt is None:
            raise web.HTTPBadRequest(text="'start_dt' is missing from query string")

        try:
            start_dt_obj = datetime.fromisoformat(start_dt)
        except ValueError:
            raise web.HTTPBadRequest(text=f"'start_dt' is invalid ISO 8601: '{start_dt}'")

        query = select([Topology.topology]).where(Topology.last_updated >= start_dt_obj)
        async with MySQLClient().lease() as conn:
            cursor = await conn.execute(query)
            return web.json_response(
                [dict(row) for row in await cursor.fetchall()],
                dumps=partial(json.dumps, default=custom_serializer),
            )

Finally, the routes need to be supplied to the :func:`~.init` function.

.. code-block:: python

    # main.py

    import json

    from tglib import ClientType, init

    from .routes import routes


    # The async_main, produce, and consume functions are omitted here for brevity

    def main() -> None:
        """Pass in the 'async_main' function, a set of clients, and 'routes' into 'init'."""
        with open("./service_config.json") as f:
            config = json.load(f)

        init(
            lambda: async_main(config),
            {ClientType.API_SERVICE_CLIENT, ClientType.MYSQL_CLIENT},
            routes,
        )
