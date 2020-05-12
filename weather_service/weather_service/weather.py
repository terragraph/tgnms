#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import namedtuple
from dataclasses import dataclass
from typing import Union, get_type_hints

from . import quantities


Coordinates = namedtuple("Coordinates", ["latitude", "longitude"])


@dataclass
class WeatherMetrics:
    temperature: quantities.Celsius
    humidity: quantities.Percent
    pressure: quantities.MmHg
    wind_speed: quantities.MetersPerSecond
    wind_direction: quantities.Degrees
    visibility: quantities.Meters

    @staticmethod
    def as_quantity(key: str, value: Union[int, float]) -> quantities.Metric:
        type_hint = get_type_hints(WeatherMetrics)[key]
        if getattr(type_hint, "__origin__", None) is Union:
            # It was an Optional, but we know there is a real value for it here,
            # so use the wrapped type
            type_hint = type_hint.__args__[0]
        quantity: quantities.Metric = type_hint(value)
        return quantity

    def __init__(self, **kwargs):
        kwargs = {
            key: WeatherMetrics.as_quantity(key, value) for key, value in kwargs.items()
        }

        for key in get_type_hints(WeatherMetrics):
            setattr(self, key, kwargs.get(key, None))


@dataclass
class WeatherState(object):
    """
    Contains metrics about a weather condition at a point in time for a location
    """

    network_name: str
    site_name: str
    coordinates: Coordinates
    metrics: WeatherMetrics
