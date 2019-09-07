#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import re

import asynctest

from tglib.clients.prometheus_client import PrometheusClient, PrometheusMetric
from tglib.exceptions import ClientMultipleInitializationError, ClientRestartError


class PrometheusClientTests(asynctest.TestCase):
    @asynctest.patch("tglib.clients.prometheus_client.aiohttp.ClientSession")
    async def setUp(self, mock_session) -> None:
        self.config = {
            "prometheus": {
                "host": "prometheus",
                "port": 9090,
                "max_queue_size": 100,
                "intervals": [30],
            }
        }

        self.client = PrometheusClient(self.config)
        await self.client.start()

    def tearDown(self) -> None:
        del PrometheusClient._instances[PrometheusClient]

    def test_client_multiple_initialization_error(self) -> None:
        with self.assertRaises(ClientMultipleInitializationError):
            PrometheusClient(self.config)

    async def test_client_restart_error(self) -> None:
        with self.assertRaises(ClientRestartError):
            await self.client.start()

    async def test_client_healthy(self) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )
        self.client._session.get.return_value.__aenter__.return_value.status = 200

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        health = await self.client.health_check()

        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/status/config"
        )
        self.assertTrue(health.healthy)

    async def test_client_unhealthy(self) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )
        self.client._session.get.return_value.__aenter__.return_value.status = 400

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]
        health = await self.client.health_check()

        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/status/config"
        )
        self.assertFalse(health.healthy)

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
            self.assertEqual(self.client.normalize(before), after)

    def test_create_query_no_interval_sec(self) -> None:
        labels = {"foo": "bar"}
        query = self.client.create_query("metric", labels)
        self.assertIn('intervalSec="30"', query)

    def test_create_regex_query(self) -> None:
        regex = re.compile("bar|baz")
        query = self.client.create_query("metric", {"foo": regex})
        self.assertIn('foo=~"bar|baz"', query)

    async def test_query_range(self) -> None:
        self.client._session.get.return_value.__aenter__.return_value.json = (
            asynctest.CoroutineMock()
        )

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]

        params = {"query": "foo", "start": 0, "end": 100, "step": "bar"}
        await self.client.query_range(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range", **{"params": params}
        )

        await self.client.query_range_ts(**params)
        params["query"] = f"timestamp({params['query']})"
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query_range", **{"params": params}
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

        host = self.config["prometheus"]["host"]
        port = self.config["prometheus"]["port"]

        params = {"query": "foo"}
        await self.client.query_latest(**params)
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query", **{"params": params}
        )

        await self.client.query_latest_ts(**params)
        params["query"] = f"timestamp({params['query']})"
        self.client._session.get.assert_called_with(
            f"http://{host}:{port}/api/v1/query", **{"params": params}
        )

    def test_write_metrics(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]

        metric = PrometheusMetric(name="metric", time=0, labels={}, value=0)
        for _ in range(self.config["prometheus"]["max_queue_size"]):
            self.assertTrue(self.client.write_metrics(interval, [metric]))

        # Metrics queue is full so this write should fail
        self.assertFalse(self.client.write_metrics(interval, [metric]))

    def test_write_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["prometheus"]["intervals"])
        self.assertFalse(self.client.write_metrics(bad_interval, []))

    def test_poll_metrics(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]
        max_queue_size = self.config["prometheus"]["max_queue_size"]

        metric = PrometheusMetric(name="metric", time=0, labels={}, value=0)
        for _ in range(max_queue_size):
            self.assertTrue(self.client.write_metrics(interval, [metric]))

        self.assertEqual(len(self.client.poll_metrics(interval)), max_queue_size)

        # This call returns an empty list because no metrics were written in between
        self.assertEqual(len(self.client.poll_metrics(interval)), 0)

    def test_poll_metrics_empty_queue(self) -> None:
        interval = self.config["prometheus"]["intervals"][0]
        self.assertEqual(len(self.client.poll_metrics(interval)), 0)

    def test_poll_metrics_invalid_interval(self) -> None:
        bad_interval = 11
        self.assertNotIn(bad_interval, self.config["prometheus"]["intervals"])
        self.assertIsNone(self.client.poll_metrics(bad_interval))
