#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from collections import namedtuple
from dataclasses import dataclass
from typing import Dict, Optional

from . import quantities


Coordinates = namedtuple("Coordinates", ["latitude", "longitude"])


@dataclass
class Metrics:
    def flat_metrics(self) -> Dict[str, quantities.Metric]:
        """
        Get all metrics as a flat dictionary
        """
        flat_metrics = {}
        for name, value in self.__dict__.items():
            if value is None:
                continue
            if isinstance(value, quantities.Metric):
                flat_metrics[name] = value
            elif isinstance(value, Metrics):
                value_with_prefixed_names: Dict[str, quantities.Metric] = {
                    f"{name}_{item_name}": value
                    for item_name, value in value.flat_metrics().items()
                }
                flat_metrics.update(value_with_prefixed_names)
            else:
                raise RuntimeError(f"Unknown value in metrics '{name}'={value}")
        return flat_metrics


@dataclass
class AirQuality(Metrics):
    pm25: quantities.MicrogramsPerMeter
    pm10: quantities.MicrogramsPerMeter
    epa_aqi: quantities.Unitless
    o3: quantities.PartsPerBillion
    so2: quantities.PartsPerBillion
    co: quantities.PartsPerMillion
    no2: quantities.PartsPerBillion


@dataclass
class WeatherMetrics(Metrics):
    temperature: quantities.Celsius
    humidity: quantities.Percent
    pressure: quantities.MmHg
    wind_speed: quantities.MetersPerSecond
    wind_direction: quantities.Degrees
    visibility: quantities.Meters
    air_quality: Optional[AirQuality]
    precipitation: quantities.MmPerHour
    precipitation_type: quantities.Unitless
    cloud_cover: quantities.Percent


@dataclass
class WeatherState(object):
    """
    Contains metrics about a weather condition at a point in time for a location
    """

    network_name: str
    site_name: str
    coordinates: Coordinates
    metrics: Optional[WeatherMetrics]
