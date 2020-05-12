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
    unit: str = "percent"


@dataclass
class Celsius(Metric[float]):
    unit: str = "celsius"


@dataclass
class Meters(Metric[float]):
    unit: str = "meters"


@dataclass
class MetersPerSecond(Metric[float]):
    unit: str = "meters_per_second"


@dataclass
class MmHg(Metric[float]):
    unit: str = "mmHg"


@dataclass
class Degrees(Metric[float]):
    unit: str = "degrees"
