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
    ScanMode as ThriftScanMode,
    ScanSubType as ThriftScanSubType,
    ScanType as ThriftScanType,
)


# Convert Thrift enums to native Python for SQLAlchemy
ScanFwStatus = Enum("ScanFwStatus", ThriftScanFwStatus._NAMES_TO_VALUES)  # type: ignore
ScanMode = Enum("ScanMode", ThriftScanMode._NAMES_TO_VALUES)  # type: ignore
ScanSubType = Enum("ScanSubType", ThriftScanSubType._NAMES_TO_VALUES)  # type: ignore
ScanType = Enum("ScanType", ThriftScanType._NAMES_TO_VALUES)  # type: ignore


Base: Any = declarative_base()


class TxScanResponse(Base):
    __tablename__ = "tx_scan_response"

    id = Column(Integer, primary_key=True)
    scan_resp_path = Column(String(255))
    timestamp = Column(DateTime, server_default=func.now())
    network_name = Column(String(255))
    scan_group_id = Column(Integer)
    tx_node_name = Column(String(255))
    token = Column(Integer)
    resp_id = Column(Integer)
    start_bwgd = Column(BigInteger)
    scan_type = Column(SQLEnum(ScanType))
    scan_sub_type = Column(SQLEnum(ScanSubType))
    scan_mode = Column(SQLEnum(ScanMode))
    apply = Column(Boolean)
    status = Column(SQLEnum(ScanFwStatus))
    tx_power = Column(Integer)
    n_responses_waiting = Column(Integer)


class RxScanResponse(Base):
    __tablename__ = "rx_scan_response"

    id = Column(Integer, primary_key=True)
    scan_resp_path = Column(String(255))
    timestamp = Column(DateTime, server_default=func.now())
    rx_node_name = Column(String(255))
    status = Column(SQLEnum(ScanFwStatus))
    new_beam_flag = Column(Integer)
    tx_scan_id = Column(Integer, ForeignKey("tx_scan_response.id"))


class ScanResponseRate(Base):
    __tablename__ = "scan_response_rate"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(255))
    scan_group_id = Column(Integer)
    scan_type = Column(SQLEnum(ScanType))
    scan_mode = Column(SQLEnum(ScanMode))
    scan_sub_type = Column(SQLEnum(ScanSubType))
    start_bwgd = Column(BigInteger)
    end_bwgd = Column(BigInteger)
    n_scans = Column(Integer)
    n_valid_scans = Column(Integer)
    n_invalid_scans = Column(Integer)
    n_incomplete_scans = Column(Integer)
    total_tx_resp = Column(Integer)
    invalid_tx_resp = Column(Integer)
    tx_errors = Column(JSON)
    total_rx_resp = Column(Integer)
    rx_errors = Column(JSON)
