#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import re

import asynctest
from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric, ops
from tglib.exceptions import ClientRestartError


class PrometheusClientTests(asynctest.TestCase):
    async def setUp(self) -> None:
        self.timeout = 1
        self.config = {"host": "prometheus", "port": 9090}

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

    def test_format_query(self) -> None:
        labels = {"foo": "bar", "quux": True}
        negate_labels = {"baz": "qux", "quuz": False}
        query = self.client.format_query("metric", labels, negate_labels)
        expected_query = 'metric{foo="bar",quux="true",baz!="qux",quuz!="false"}'
        self.assertEqual(query, expected_query)

    def test_format_query_regex_label(self) -> None:
        labels = {"foo": re.compile("bar|baz")}
        negate_labels = {"qux": re.compile("quux|quuz")}
        query = self.client.format_query("metric", labels, negate_labels)
        expected_query = 'metric{foo=~"bar|baz",qux!~"quux|quuz"}'
        self.assertEqual(query, expected_query)

    def test_format_query_invalid_char_in_metric(self) -> None:
        query = self.client.format_query("1-metric")
        self.assertEqual("1-metric", query)

    def test_format_query_ops(self) -> None:
        labels = {"foo": "bar"}
        query = ops.avg_over_time(self.client.format_query("metric", labels), "24h")
        expected_query = 'avg_over_time(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.count_over_time(self.client.format_query("metric", labels), "24h")
        expected_query = 'count_over_time(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.delta(self.client.format_query("metric", labels), "24h")
        expected_query = 'delta(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.max_over_time(self.client.format_query("metric", labels), "24h")
        expected_query = 'max_over_time(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.rate(self.client.format_query("metric", labels), "24h")
        expected_query = 'rate(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.resets(self.client.format_query("metric", labels), "24h")
        expected_query = 'resets(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)
        query = ops.max_over_time(self.client.format_query("metric", labels), "24h")
        expected_query = 'max_over_time(metric{foo="bar"} [24h])'
        self.assertEqual(query, expected_query)

    @asynctest.patch("time.time", return_value=100)
    async def test_query_range(self, patched_time_time) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["host"]
        port = self.config["port"]
        params = {"query": "foo", "step": "30s", "start": 0, "end": 100}

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

        # Test that the mock value of time.time() is used when no "end" is provided
        del params["end"]
        await self.client.query_range(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range",
            params={**params, "end": 100},
            timeout=self.timeout,
        )

    async def test_query_range_invalid_params(self) -> None:
        params = {"query": "foo", "step": "30s", "start": 100, "end": 0}
        self.assertGreater(params["start"], params["end"])
        with self.assertRaises(ValueError):
            await self.client.query_range(**params)
        with self.assertRaises(ValueError):
            await self.client.query_range_ts(**params)

        duration_re = "[0-9]+[smhdwy]"
        params = {"query": "foo", "step": "bar", "start": 0, "end": 100}
        self.assertNotRegex(params["step"], duration_re)
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

    def test_write_and_poll_metrics(self) -> None:
        metrics = []

        for i in range(10):
            metric = PrometheusMetric(name="foo", labels={"number": i}, value=i, time=1)
            metrics.append(metric)

        self.client.write_metrics(metrics)
        datapoints = self.client.poll_metrics()
        self.assertEqual(len(datapoints), 10)

        # This call returns an empty list because no metrics were written in between
        self.assertEqual(len(self.client.poll_metrics()), 0)

    def test_write_metrics_no_timestamp(self) -> None:
        metric = PrometheusMetric(name="foo", labels={"bar": "baz"}, value=100)
        self.client.write_metrics([metric])

        datapoints = self.client.poll_metrics()
        self.assertEqual(len(datapoints), 1)
        self.assertEqual(datapoints[0], 'foo{bar="baz"} 100')

    def test_redundant_write_metrics(self) -> None:
        self.client.write_metrics(
            [PrometheusMetric(name="foo", labels={"bar": "baz"}, value=100, time=1)]
        )
        self.client.write_metrics(
            [PrometheusMetric(name="foo", labels={"bar": "baz"}, value=101, time=2)]
        )

        datapoints = self.client.poll_metrics()
        self.assertEqual(len(datapoints), 1)
        self.assertEqual(datapoints[0], 'foo{bar="baz"} 101 2')

    def test_poll_metrics_empty_queue(self) -> None:
        self.assertFalse(self.client.poll_metrics())
