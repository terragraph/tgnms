#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import logging
from typing import Any, Optional

import aiohttp

from .quantities import (
    Celsius,
    Degrees,
    Meters,
    MetersPerSecond,
    MicrogramsPerMeter,
    MmHg,
    MmPerHour,
    PartsPerBillion,
    PartsPerMillion,
    Percent,
    Unitless,
)
from .weather import AirQuality, Coordinates, WeatherMetrics


class WeatherAPIClient(abc.ABC):
    def __init__(self) -> None:
        self.session: Optional[aiohttp.ClientSession] = None

    @abc.abstractmethod
    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        pass

    async def validate_and_get_json(
        self, url: str, response: aiohttp.ClientResponse
    ) -> Any:
        if response.status != 200:
            raise RuntimeError(
                f"Request to {url} failed: {response.reason} ({response.status})"
            )
        return await response.json()

    async def __aenter__(self) -> "WeatherAPIClient":
        self.session = aiohttp.ClientSession(trust_env=True)
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        assert (
            self.session is not None
        ), "Weather API must be used from an async context manager"
        await self.session.close()


class OpenWeatherMapClient(WeatherAPIClient):
    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self.base_url = "http://api.openweathermap.org/data/2.5/weather"

    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        assert (
            self.session is not None
        ), "Weather API must be used from an async context manager"
        params = {
            "lat": str(coordinates.latitude),
            "lon": str(coordinates.longitude),
            "appid": self.api_key,
            "units": "metric",
        }
        logging.debug(f"Requesting from {self.base_url}")
        async with self.session.get(self.base_url, params=params) as response:
            content = await self.validate_and_get_json(self.base_url, response)

        return WeatherMetrics(
            temperature=Celsius(content.get("main", {}).get("temp")),
            humidity=Percent(content.get("main", {}).get("humidity")),
            pressure=MmHg(content.get("main", {}).get("temp")),
            wind_speed=MetersPerSecond(content.get("wind", {}).get("speed")),
            wind_direction=Degrees(content.get("wind", {}).get("deg")),
            visibility=Meters(content.get("visibility")),
            air_quality=None,
            precipitation=MmPerHour(None),
            cloud_cover=Percent(None),
        )


class ClimaCellClient(WeatherAPIClient):
    """
    See https://developer.climacell.co/v3/reference
    """

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self.base_url = "https://api.climacell.co/v3/weather/realtime"
        self.fields = [
            "temp",
            "humidity",
            "precipitation",
            "wind_speed",
            "wind_direction",
            "baro_pressure",
            "visibility",
            "cloud_cover",
            "pm25",
            "pm10",
            "o3",
            "no2",
            "co",
            "so2",
            "epa_aqi",
        ]

    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        assert (
            self.session is not None
        ), "Weather API must be used from an async context manager"
        params = {
            "lat": str(coordinates.latitude),
            "lon": str(coordinates.longitude),
            "apikey": self.api_key,
            "unit_system": "si",
            "fields": ",".join(self.fields),
        }
        async with self.session.get(
            self.base_url, timeout=15, params=params
        ) as response:
            content = await self.validate_and_get_json(self.base_url, response)

        air_quality = AirQuality(
            pm25=MicrogramsPerMeter(content["pm25"]["value"]),
            pm10=MicrogramsPerMeter(content["pm10"]["value"]),
            epa_aqi=Unitless(content["epa_aqi"]["value"]),
            o3=PartsPerBillion(content["o3"]["value"]),
            so2=PartsPerBillion(content["so2"]["value"]),
            co=PartsPerMillion(content["co"]["value"]),
            no2=PartsPerBillion(content["no2"]["value"]),
        )
        return WeatherMetrics(
            temperature=Celsius(content["temp"]["value"]),
            humidity=Percent(content["humidity"]["value"]),
            pressure=MmHg(content["baro_pressure"]["value"]),
            wind_speed=MetersPerSecond(content["wind_speed"]["value"]),
            wind_direction=Degrees(content["wind_direction"]["value"]),
            visibility=Meters(content["visibility"]["value"]),
            air_quality=air_quality,
            precipitation=MmPerHour(content["precipitation"]["value"]),
            cloud_cover=Percent(content["cloud_cover"]["value"]),
        )
