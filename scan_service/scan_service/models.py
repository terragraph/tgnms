#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from enum import Enum
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.ext.declarative import declarative_base
from terragraph_thrift.Controller.ttypes import (
    ScanFwStatus as ThriftScanFwStatus,
    ScanSubType as ThriftScanSubType,
)


# Convert Thrift enums to native Python for SQLAlchemy
ScanFwStatus = Enum("ScanFwStatus", ThriftScanFwStatus._NAMES_TO_VALUES)  # type: ignore
ScanSubType = Enum("ScanSubType", ThriftScanSubType._NAMES_TO_VALUES)  # type: ignore


class ScanType(Enum):
    IM = 2  # Interference measurement

    @classmethod
    def has_value(cls, value: int) -> bool:
        return any(value == item.value for item in cls)


class ScanMode(Enum):
    COARSE = 1
    FINE = 2
    SELECTIVE = 3
    RELATIVE = 4

    @classmethod
    def has_value(cls, value: int) -> bool:
        return any(value == item.value for item in cls)


class ScanTestStatus(Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FINISHED = "finished"
    FAILED = "failed"

    @classmethod
    def has_value(cls, value: str) -> bool:
        return any(value == item.value for item in cls)


Base: Any = declarative_base()


class ScanTestSchedule(Base):
    __tablename__ = "scan_test_schedule"

    id = Column(Integer, primary_key=True)
    enabled = Column(Boolean, nullable=False)
    cron_expr = Column(String(255), nullable=False)


class ScanTestParams(Base):
    __tablename__ = "scan_test_params"

    id = Column(Integer, primary_key=True)
    schedule_id = Column(
        Integer, ForeignKey("scan_test_schedule.id", ondelete="SET NULL"), nullable=True
    )
    network_name = Column(String(255), index=True, nullable=False)
    type = Column(SQLEnum(ScanType), nullable=False)
    mode = Column(SQLEnum(ScanMode), nullable=False)
    options = Column(JSON, nullable=False)


class ScanTestExecution(Base):
    __tablename__ = "scan_test_execution"

    id = Column(Integer, primary_key=True)
    params_id = Column(Integer, ForeignKey("scan_test_params.id"), nullable=False)
    start_dt = Column(DateTime, server_default=func.now(), nullable=False)
    end_dt = Column(DateTime, onupdate=func.now(), nullable=True)
    status = Column(SQLEnum(ScanTestStatus), index=True, nullable=False)


class ScanResults(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True)
    execution_id = Column(Integer, ForeignKey("scan_test_execution.id"), nullable=False)
    network_name = Column(String(255), nullable=False)
    tx_node = Column(String(255), nullable=True)
    group_id = Column(Integer, nullable=True)
    type = Column(SQLEnum(ScanType), nullable=False)
    mode = Column(SQLEnum(ScanMode), nullable=False)
    results_path = Column(String(255), nullable=True)
    resp_id = Column(Integer, nullable=True)
    subtype = Column(SQLEnum(ScanSubType), nullable=True)
    start_bwgd = Column(BigInteger, nullable=True)
    token = Column(Integer, index=True, nullable=False)
    tx_power = Column(Integer, nullable=True)
    tx_status = Column(SQLEnum(ScanFwStatus), nullable=True)
    rx_statuses = Column(JSON, nullable=True)
    n_responses_waiting = Column(Integer, nullable=True)


class ConnectivityResults(Base):
    __tablename__ = "connectivity_results"

    id = Column(Integer, primary_key=True)
    execution_id = Column(Integer, ForeignKey("scan_test_execution.id"), nullable=False)
    network_name = Column(String(255), nullable=False)
    group_id = Column(Integer, nullable=True)
    token = Column(Integer, nullable=False)
    tx_node = Column(String(255), nullable=False)
    rx_node = Column(String(255), nullable=False)
    routes = Column(JSON, nullable=False)


class InterferenceResults(Base):
    __tablename__ = "interference_results"

    id = Column(Integer, primary_key=True)
    execution_id = Column(Integer, ForeignKey("scan_test_execution.id"), nullable=False)
    network_name = Column(String(255), nullable=False)
    group_id = Column(Integer, nullable=True)
    token = Column(Integer, nullable=False)
    tx_node = Column(String(255), nullable=False)
    tx_to_node = Column(String(255), nullable=False)
    tx_power_idx = Column(Integer, nullable=True)
    rx_node = Column(String(255), nullable=False)
    rx_from_node = Column(String(255), nullable=False)
    inr_curr_power = Column(JSON, nullable=False)
    inr_max_power = Column(JSON, nullable=False)
