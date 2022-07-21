#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
    async def request(self, coordinates: Coordinates) -> Optional[WeatherMetrics]:
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
            precipitation_type=Unitless(None),
        )


class ClimaCellClient(WeatherAPIClient):
    """
    See https://developer.climacell.co/v3/reference
    """

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self.base_url = "https://data.climacell.co/v4/timelines"
        self.fields = [
            "temperature",
            "humidity",
            "precipitationIntensity",
            "windSpeed",
            "windDirection",
            "pressureSeaLevel",
            "precipitationType",
            "visibility",
            "cloudCover",
            "particulateMatter25",
            "particulateMatter10",
            "pollutantO3",
            "pollutantNO2",
            "pollutantCO",
            "pollutantSO2",
            "epaIndex",
        ]

    async def request(self, coordinates: Coordinates) -> Optional[WeatherMetrics]:
        assert (
            self.session is not None
        ), "Weather API must be used from an async context manager"
        params = {
            "location": f"{coordinates.latitude},{coordinates.longitude}",
            "apikey": self.api_key,
            "units": "metric",
            "fields": ",".join(self.fields),
            "timesteps": "current",
        }
        async with self.session.get(
            self.base_url, timeout=15, params=params
        ) as response:
            content = await self.validate_and_get_json(self.base_url, response)
            if (
                not content["data"]["timelines"]
                or not content["data"]["timelines"][0]["intervals"]
            ):
                return None
            else:
                content = content["data"]["timelines"][0]["intervals"][0]["values"]

        air_quality = AirQuality(
            pm25=MicrogramsPerMeter(content["particulateMatter25"]),
            pm10=MicrogramsPerMeter(content["particulateMatter10"]),
            epa_aqi=Unitless(content["epaIndex"]),
            o3=PartsPerBillion(content["pollutantO3"]),
            so2=PartsPerBillion(content["pollutantSO2"]),
            co=PartsPerMillion(content["pollutantCO"]),
            no2=PartsPerBillion(content["pollutantNO2"]),
        )
        return WeatherMetrics(
            temperature=Celsius(content["temperature"]),
            humidity=Percent(content["humidity"]),
            pressure=MmHg(content["pressureSeaLevel"]),
            wind_speed=MetersPerSecond(content["windSpeed"]),
            wind_direction=Degrees(content["windDirection"]),
            visibility=Meters(content["visibility"]),
            air_quality=air_quality,
            precipitation=MmPerHour(content["precipitationIntensity"]),
            precipitation_type=Unitless(content["precipitationType"]),
            cloud_cover=Percent(content["cloudCover"]),
        )
