#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

from dataclasses import dataclass, field


@dataclass
class Job:
    """Struct for representing pipeline job configurations."""

    name: str
    start_time: int
    params: object = field(default_factory=dataclass)
