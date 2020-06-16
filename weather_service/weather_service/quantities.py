#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from dataclasses import dataclass
from typing import Generic, Optional, TypeVar


T = TypeVar("T")


@dataclass
class Metric(Generic[T]):
    """
    Contains an optional metric of some unit
    """

    value: Optional[T]
    unit: str


@dataclass
class Percent(Metric[int]):
    value: Optional[int]
    unit: str = "percent"


@dataclass
class Celsius(Metric[float]):
    value: Optional[float]
    unit: str = "celsius"


@dataclass
class Meters(Metric[float]):
    value: Optional[float]
    unit: str = "meters"


@dataclass
class MetersPerSecond(Metric[float]):
    value: Optional[float]
    unit: str = "meters_per_second"


@dataclass
class MmHg(Metric[float]):
    value: Optional[float]
    unit: str = "mmHg"


@dataclass
class Degrees(Metric[float]):
    value: Optional[float]
    unit: str = "degrees"


@dataclass
class MicrogramsPerMeter(Metric[float]):
    value: Optional[float]
    unit: str = "ug_per_m3"


@dataclass
class PartsPerMillion(Metric[int]):
    value: Optional[int]
    unit: str = "ppm"


@dataclass
class PartsPerBillion(Metric[int]):
    value: Optional[int]
    unit: str = "ppb"


@dataclass
class Unitless(Metric[int]):
    value: Optional[int]
    unit: str = "unitless"


@dataclass
class MmPerHour(Metric[float]):
    value: Optional[float]
    unit: str = "mm_per_hr"
