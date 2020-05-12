#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import unittest

import weather_service.main
from tglib.clients import APIServiceClient
from weather_service.api_clients import WeatherAPIClient
from weather_service.weather import Coordinates, WeatherMetrics


class MockWeatherClient(WeatherAPIClient):
    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        logging.info("Requesting from mock API")
        return WeatherMetrics(
            temperature=1, humidity=2, pressure=3, wind_speed=4, wind_direction=5
        )


class MockAPIService(APIServiceClient):
    async def request_all(self, name: str, return_exceptions: bool):
        assert name == "getTopology"
        return {
            "fake network name": {
                "sites": [
                    {
                        "name": "fake site 1",
                        "location": {"latitude": 27, "longitude": -122},
                    },
                    {
                        "name": "fake site 2",
                        "location": {"latitude": 30, "longitude": -121},
                    },
                ]
            }
        }


class WeatherServiceTests(unittest.TestCase):
    def test_location_api(self):
        async def test_get_route():
            # Run one iteration (fetch data, store it in tglib's PrometheusClient)
            prometheus_metrics = await weather_service.main.fetch_weather_data(
                MockAPIService(timeout=1), MockWeatherClient()
            )

            # Check a random line from the mock run
            self.assertEqual(prometheus_metrics[0].name, "weather_temperature_celsius")
            self.assertEqual(prometheus_metrics[0].value, 1)

        asyncio.get_event_loop().run_until_complete(test_get_route())


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
