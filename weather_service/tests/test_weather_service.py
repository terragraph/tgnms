#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import asyncio
import logging
import unittest

import weather_service.main
import weather_service.quantities as quantities
from tglib.clients import APIServiceClient
from weather_service.api_clients import WeatherAPIClient
from weather_service.weather import Coordinates, WeatherMetrics


class MockWeatherClient(WeatherAPIClient):
    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        logging.info("Requesting from mock API")
        return WeatherMetrics(
            temperature=quantities.Celsius(30),
            humidity=quantities.Percent(100),
            pressure=quantities.MmHg(None),
            wind_speed=quantities.MetersPerSecond(None),
            wind_direction=quantities.Degrees(None),
            visibility=quantities.Meters(None),
            air_quality=None,
            precipitation=quantities.MmPerHour(None),
            cloud_cover=quantities.Percent(None),
        )


class MockAPIService(APIServiceClient):
    async def request_all(self, name: str, return_exceptions: bool):
        assert name == "getTopology"
        return {
            "fake network name": {
                "sites": [
                    {
                        "name": "fake site fremont",
                        "location": {"latitude": 37.540211, "longitude": -121.989162},
                    },
                    {
                        "name": "fake site hungary",
                        "location": {"latitude": 47.440977, "longitude": 19.057166},
                    },
                ]
            }
        }


class WeatherServiceTests(unittest.TestCase):
    def test_location_api(self):
        async def test_get_route():
            async with MockWeatherClient() as weather_client:
                # Run one iteration (fetch data, store it in tglib's PrometheusClient)
                prometheus_metrics = await weather_service.main.fetch_weather_data(
                    MockAPIService(timeout=1), weather_client
                )

            # Check a random line from the mock run
            self.assertEqual(prometheus_metrics[0].name, "weather_temperature_celsius")
            self.assertEqual(prometheus_metrics[0].value, 30)

        asyncio.get_event_loop().run_until_complete(test_get_route())


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
