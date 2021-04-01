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
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.ext.declarative import declarative_base


class NetworkTestType(enum.Enum):
    PARALLEL_LINK = "parallel_link"
    PARALLEL_NODE = "parallel_node"
    SEQUENTIAL_LINK = "sequential_link"
    SEQUENTIAL_NODE = "sequential_node"

    @classmethod
    def has_value(cls, value: str) -> bool:
        return any(value == item.value for item in cls)


class NetworkTestStatus(enum.Enum):
    RUNNING = "running"
    PROCESSING = "processing"
    FINISHED = "finished"
    ABORTED = "aborted"
    FAILED = "failed"

    @classmethod
    def has_value(cls, value: str) -> bool:
        return any(value == item.value for item in cls)


class NetworkTestHealth(enum.Enum):
    EXCELLENT = 1
    GOOD = 2
    MARGINAL = 3
    POOR = 4
    MISSING = 5


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
    network_name = Column(String(255), index=True, nullable=False)
    iperf_options = Column(JSON, nullable=False)
    allowlist = Column(JSON(none_as_null=True), nullable=True)


class NetworkTestExecution(Base):
    __tablename__ = "network_test_execution"

    id = Column(Integer, primary_key=True)
    params_id = Column(Integer, ForeignKey("network_test_params.id"), nullable=False)
    start_dt = Column(DateTime, server_default=func.now(), nullable=False)
    end_dt = Column(DateTime, onupdate=func.now(), nullable=True)
    status = Column(Enum(NetworkTestStatus), index=True, nullable=False)


class NetworkTestResult(Base):
    __tablename__ = "network_test_result"

    id = Column(Integer, primary_key=True)
    execution_id = Column(
        Integer, ForeignKey("network_test_execution.id"), nullable=False
    )
    status = Column(Enum(NetworkTestStatus), index=True, nullable=False)
    src_node_mac = Column(String(255), index=True, nullable=False)
    dst_node_mac = Column(String(255), index=True, nullable=False)
    asset_name = Column(String(255), nullable=False)
    start_dt = Column(DateTime, server_default=func.now(), nullable=False)
    end_dt = Column(DateTime, onupdate=func.now(), nullable=True)
    # Derived Columns
    health = Column(Enum(NetworkTestHealth), nullable=True)
    # Firmware Columns
    link_unavail_ratio = Column(Float, nullable=True)
    mcs_avg = Column(Float, nullable=True)
    mcs_p10 = Column(Float, nullable=True)
    mcs_samples_with_traffic = Column(Float, nullable=True)
    rssi_avg = Column(Float, nullable=True)
    snr_avg = Column(Float, nullable=True)
    rx_beam_idx = Column(Float, nullable=True)
    rx_packet_count = Column(Float, nullable=True)
    rx_per = Column(Float, nullable=True)
    tx_beam_idx = Column(Float, nullable=True)
    tx_packet_count = Column(Float, nullable=True)
    tx_per = Column(Float, nullable=True)
    tx_pwr_avg = Column(Float, nullable=True)
    udp_pinger_loss_ratio = Column(Float, nullable=True)
    udp_pinger_rtt_avg = Column(Float, nullable=True)
    link_distance = Column(Float, nullable=True)
    # Iperf Columns
    iperf_min_throughput = Column(Float, nullable=True)
    iperf_max_throughput = Column(Float, nullable=True)
    iperf_avg_throughput = Column(Float, nullable=True)
    iperf_min_lost_percent = Column(Float, nullable=True)
    iperf_max_lost_percent = Column(Float, nullable=True)
    iperf_avg_lost_percent = Column(Float, nullable=True)
    iperf_min_retransmits = Column(Float, nullable=True)
    iperf_max_retransmits = Column(Float, nullable=True)
    iperf_avg_retransmits = Column(Float, nullable=True)
    # 64KiB to induce mediumtext column type
    iperf_client_blob = Column(Text(65536), nullable=True)
    iperf_server_blob = Column(Text(65536), nullable=True)
