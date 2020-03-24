#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import re

import asynctest
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, ops
from tglib.exceptions import ClientRestartError


class PrometheusClientTests(asynctest.TestCase):
    async def setUp(self) -> None:
        self.timeout = 1
        self.config = {"host": "prometheus", "port": 9090, "intervals": [30]}

        await PrometheusClient.start({"prometheus": self.config})
        self.client = PrometheusClient(self.timeout)
        self.client._session = asynctest.CoroutineMock()

    async def tearDown(self) -> None:
        await self.client.stop()

    async def test_client_restart_error(self) -> None:
        with self.assertRaises(ClientRestartError):
            await self.client.start({"prometheus": self.config})

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

        for raw, normalized in strings.items():
            self.assertEqual(self.client.normalize(raw), normalized)

    def test_create_query_no_interval_sec(self) -> None:
        labels = {"foo": "bar"}
        query = self.client.create_query("metric", labels)
        self.assertIn('intervalSec="30"', query)

    def test_create_query_regex_label(self) -> None:
        labels = {"foo": re.compile("bar|baz")}
        query = self.client.create_query("metric", labels)
        self.assertIn('foo=~"bar|baz"', query)

    def test_create_query_invalid_char_in_metric(self) -> None:
        query = self.client.create_query("1-metric")
        self.assertIn("1-metric", query)

    def test_create_query_ops(self) -> None:
        labels = {"foo": "bar"}
        query = ops.avg_over_time(self.client.create_query("metric", labels), "24h")
        expected_query = 'avg_over_time(metric{intervalSec="30",foo="bar"} [24h])'
        self.assertEqual(query, expected_query)

    async def test_query_range(self) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["host"]
        port = self.config["port"]
        params = {"query": "foo", "start": 0, "end": 100, "step": "bar"}

        await self.client.query_range(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range",
            params=params,
            timeout=self.timeout,
        )

        await self.client.query_range_ts(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range",
            params={**params, "query": f"timestamp({params['query']})"},
            timeout=self.timeout,
        )

    async def test_query_invalid_range(self) -> None:
        params = {"query": "foo", "start": 100, "end": 0, "step": "bar"}
        self.assertGreater(params["start"], params["end"])

        with self.assertRaises(ValueError):
            await self.client.query_range(**params)

        with self.assertRaises(ValueError):
            await self.client.query_range_ts(**params)

    async def test_query_latest(self) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["host"]
        port = self.config["port"]
        params = {"query": "foo"}

        await self.client.query_latest(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query", params=params, timeout=self.timeout
        )

        await self.client.query_latest_ts(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query",
            params={"query": f"timestamp({params['query']})"},
            timeout=self.timeout,
        )

        await self.client.query_latest(**params, time=10)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query",
            params={**params, "time": 10},
            timeout=self.timeout,
        )

    def test_write_metrics(self) -> None:
        interval = self.config["intervals"][0]
        metrics = {}

        for i in range(10):
            id = self.client.create_query(metric_name="foo", labels={"number": i})
            metrics[id] = PrometheusMetric(value=i, time=1)
            self.assertTrue(self.client.write_metrics(interval, metrics))

    def test_write_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["intervals"])
        self.assertFalse(self.client.write_metrics(bad_interval, []))

    def test_poll_metrics(self) -> None:
        interval = self.config["intervals"][0]
        metrics = {}

        for i in range(10):
            id = self.client.create_query(metric_name="foo", labels={"number": i})
            metrics[id] = PrometheusMetric(value=i, time=1)
            self.assertTrue(self.client.write_metrics(interval, metrics))

        datapoints = self.client.poll_metrics(interval)
        self.assertEqual(len(datapoints), 10)

        # This call returns an empty list because no metrics were written in between
        self.assertEqual(len(self.client.poll_metrics(interval)), 0)

    def test_write_metrics_no_timestamp(self) -> None:
        interval = self.config["intervals"][0]

        id = self.client.create_query(metric_name="foo")
        self.client.write_metrics(interval, {id: PrometheusMetric(value=100)})

        datapoints = self.client.poll_metrics(interval)
        self.assertEqual(len(datapoints), 1)

        self.assertEqual(datapoints[0], 'foo{intervalSec="30"} 100')

    def test_redundant_write_metrics(self) -> None:
        interval = self.config["intervals"][0]

        id = self.client.create_query(metric_name="foo")
        self.client.write_metrics(interval, {id: PrometheusMetric(value=0, time=1)})
        self.client.write_metrics(interval, {id: PrometheusMetric(value=100, time=1)})

        datapoints = self.client.poll_metrics(interval)
        self.assertEqual(len(datapoints), 1)
        self.assertEqual(datapoints[0], 'foo{intervalSec="30"} 100 1')

    def test_poll_metrics_empty_queue(self) -> None:
        interval = self.config["intervals"][0]
        self.assertEqual(len(self.client.poll_metrics(interval)), 0)

    def test_poll_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["intervals"])
        self.assertIsNone(self.client.poll_metrics(bad_interval))
