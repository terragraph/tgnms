#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import re

import asynctest

from tglib.clients.prometheus_client import (
    PrometheusClient,
    PrometheusMetric,
    create_query,
    normalize,
)
from tglib.exceptions import ClientRestartError


class PrometheusClientTests(asynctest.TestCase):
    @asynctest.patch("tglib.clients.prometheus_client.aiohttp.ClientSession")
    async def setUp(self, mock_session) -> None:
        self.mock_session = mock_session
        self.timeout = 1
        self.config = {
            "prometheus": {"host": "prometheus", "port": 9090, "intervals": [30]}
        }

        await PrometheusClient.start(self.config)

    async def tearDown(self) -> None:
        f = asyncio.Future()
        f.set_result(None)
        self.mock_session.close.return_value = f
        PrometheusClient._session = self.mock_session
        await PrometheusClient.stop()

    async def test_client_restart_error(self) -> None:
        with self.assertRaises(ClientRestartError):
            await PrometheusClient.start(self.config)

    async def test_client_healthy(self) -> None:
        self.mock_session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )
        self.mock_session.get.return_value.__aenter__.return_value.status = 200

        PrometheusClient._session = self.mock_session
        result = await PrometheusClient.health_check()

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        self.mock_session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/status/config", **{"timeout": 1}
        )
        self.assertTrue(result.healthy)

    async def test_client_unhealthy(self) -> None:
        self.mock_session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )
        self.mock_session.get.return_value.__aenter__.return_value.status = 400

        PrometheusClient._session = self.mock_session
        result = await PrometheusClient.health_check()

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        self.mock_session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/status/config", **{"timeout": 1}
        )
        self.assertFalse(result.healthy)

    def test_normalize(self) -> None:
        strings = {
            "foo.bar": "foo_bar",
            "foobar": "foobar",
            "//foobar": "__foobar",
            "[foobar]": "_foobar_",
            "foo-bar": "foo_bar",
            "foo_bar": "foo_bar",
            "f.o-o/b[a]r": "f_o_o_b_a_r",
        }

        for before, after in strings.items():
            self.assertEqual(normalize(before), after)

    def test_create_query_no_interval_sec(self) -> None:
        labels = {"foo": "bar"}
        query = create_query("metric", labels)
        self.assertIn('intervalSec="30"', query)

    def test_create_regex_query(self) -> None:
        regex = re.compile("bar|baz")
        query = create_query("metric", {"foo": regex})
        self.assertIn('foo=~"bar|baz"', query)

    async def test_query_range(self) -> None:
        self.mock_session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        params = {"query": "foo", "start": 0, "end": 100, "step": "bar"}

        client = PrometheusClient(self.timeout)
        client._session = self.mock_session
        await client.query_range(**params)
        self.mock_session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range",
            **{"params": params, "timeout": self.timeout},
        )

        await client.query_range_ts(**params)
        params["query"] = f"timestamp({params['query']})"
        client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range",
            **{"params": params, "timeout": self.timeout},
        )

    async def test_query_invalid_range(self) -> None:
        params = {"query": "foo", "start": 100, "end": 0, "step": "bar"}
        self.assertGreater(params["start"], params["end"])

        client = PrometheusClient(self.timeout)
        client._session = self.mock_session

        with self.assertRaises(ValueError):
            await client.query_range(**params)

        with self.assertRaises(ValueError):
            await client.query_range_ts(**params)

    async def test_query_latest(self) -> None:
        self.mock_session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        params = {"query": "foo"}

        client = PrometheusClient(self.timeout)
        client._session = self.mock_session
        await client.query_latest(**params)
        self.mock_session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query",
            **{"params": params, "timeout": self.timeout},
        )

        await client.query_latest_ts(**params)
        params["query"] = f"timestamp({params['query']})"
        client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query",
            **{"params": params, "timeout": self.timeout},
        )

    def test_write_metrics(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]
        metrics = {}

        for i in range(10):
            id = create_query(metric_name="foo", labels={"number": i})
            metrics[id] = PrometheusMetric(value=i, time=1)
            self.assertTrue(PrometheusClient.write_metrics(interval, metrics))

    def test_write_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["prometheus"]["intervals"])
        self.assertFalse(PrometheusClient.write_metrics(bad_interval, []))

    def test_poll_metrics(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]
        metrics = {}

        for i in range(10):
            id = create_query(metric_name="foo", labels={"number": i})
            metrics[id] = PrometheusMetric(value=i, time=1)
            self.assertTrue(PrometheusClient.write_metrics(interval, metrics))

        datapoints = PrometheusClient.poll_metrics(interval)
        self.assertEqual(len(datapoints), 10)

        # This call returns an empty list because no metrics were written in between
        self.assertEqual(len(PrometheusClient.poll_metrics(interval)), 0)

    def test_write_metrics_no_timestamp(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]

        id = create_query(metric_name="foo")
        PrometheusClient.write_metrics(interval, {id: PrometheusMetric(value=100)})

        datapoints = PrometheusClient.poll_metrics(interval)
        self.assertEqual(len(datapoints), 1)

        # Prometheus ignores leading and trailing whitespace
        self.assertEqual(datapoints[0], 'foo{intervalSec="30"} 100 ')

    def test_redundant_write_metrics(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]

        id = create_query(metric_name="foo")
        PrometheusClient.write_metrics(
            interval, {id: PrometheusMetric(value=0, time=1)}
        )
        PrometheusClient.write_metrics(
            interval, {id: PrometheusMetric(value=100, time=1)}
        )

        datapoints = PrometheusClient.poll_metrics(interval)
        self.assertEqual(len(datapoints), 1)
        self.assertEqual(datapoints[0], 'foo{intervalSec="30"} 100 1')

    def test_poll_metrics_empty_queue(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]
        self.assertEqual(len(PrometheusClient.poll_metrics(interval)), 0)

    def test_poll_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["prometheus"]["intervals"])
        self.assertIsNone(PrometheusClient.poll_metrics(bad_interval))
