#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import enum
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.ext.declarative import declarative_base


class NetworkTestType(enum.Enum):
    MULTIHOP_TEST = "multihop"
    PARALLEL_LINK_TEST = "parallel"
    SEQUENTIAL_LINK_TEST = "sequential"

    @classmethod
    def has_value(cls, value) -> bool:
        return any(value == item.value for item in cls)


class NetworkTestStatus(enum.Enum):
    RUNNING = 1
    FINISHED = 2
    ABORTED = 3
    FAILED = 4


Base: Any = declarative_base()


class NetworkTestSchedule(Base):
    __tablename__ = "network_test_schedule"

    id = Column(Integer, primary_key=True)
    enabled = Column(Boolean, nullable=False)
    cron_expr = Column(String(255), nullable=False)


class NetworkTestParams(Base):
    __tablename__ = "network_test_params"

    id = Column(Integer, primary_key=True)
    schedule_id = Column(
        Integer,
        ForeignKey("network_test_schedule.id", ondelete="SET NULL"),
        nullable=True,
    )
    test_type = Column(Enum(NetworkTestType), nullable=False)
    network_name = Column(String(255), nullable=False)
    iperf_options = Column(JSON, nullable=False)


class NetworkTestExecution(Base):
    __tablename__ = "network_test_execution"

    id = Column(Integer, primary_key=True)
    params_id = Column(Integer, ForeignKey("network_test_params.id"), nullable=False)
    start_dt = Column(DateTime, server_default=func.now(), nullable=False)
    end_dt = Column(DateTime, nullable=True)
    status = Column(Enum(NetworkTestStatus), nullable=False)
