#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from enum import Enum, IntEnum
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String, func, ForeignKey
from sqlalchemy.ext.declarative import declarative_base


class NodePowerStatus(IntEnum):
    LINK_ALIVE = 3


class NodeAlignmentStatus(IntEnum):
    TX_RX_HEALTHY = 1


class Health(Enum):
    EXCELLENT = 1
    GOOD = 2
    MARGINAL = 3
    POOR = 4
    UNKNOWN = 5


Base: Any = declarative_base()


class NetworkHealthExecution(Base):
    __tablename__ = "network_health_execution"

    id = Column(Integer, primary_key=True)
    start_dt = Column(DateTime, server_default=func.now(), index=True, nullable=False)


class NetworkStatsHealth(Base):
    __tablename__ = "network_stats_health"

    id = Column(Integer, primary_key=True)
    execution_id = Column(
        Integer, ForeignKey("network_health_execution.id"), nullable=False
    )
    network_name = Column(String(255), index=True, nullable=False)
    link_name = Column(String(255), nullable=True)
    node_name = Column(String(255), nullable=True)
    stats_health = Column(JSON, nullable=True)
