#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import abc
import json
import logging
from typing import Optional

import aiohttp

from .weather import Coordinates, WeatherMetrics


class WeatherAPIClient(abc.ABC):
    @abc.abstractmethod
    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        pass


class OpenWeatherMapClient(WeatherAPIClient):
    session: Optional[aiohttp.ClientSession]

    def __init__(self, api_key: str):
        super().__init__()
        self.api_key = api_key
        self.base_url = "http://api.openweathermap.org/data/2.5/weather"
        self.session = None

    async def request(self, coordinates: Coordinates) -> WeatherMetrics:
        if self.session is None:
            self.session = aiohttp.ClientSession(trust_env=True)

        params = {
            "lat": str(coordinates.latitude),
            "lon": str(coordinates.longitude),
            "appid": self.api_key,
            "units": "metric",
        }
        logging.debug(f"Requesting from {self.base_url}")
        response = await self.session.get(self.base_url, params=params)
        content = json.loads(await response.content.read())
        return WeatherMetrics(
            temperature=content.get("main", {}).get("temp", None),
            humidity=content.get("main", {}).get("humidity", None),
            pressure=content.get("main", {}).get("temp", None),
            wind_speed=content.get("wind", {}).get("speed", None),
            wind_direction=content.get("wind", {}).get("deg", None),
            visibility=content.get("visibility", None),
        )
