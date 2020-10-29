#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from enum import Enum, IntEnum
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String, func
from sqlalchemy.ext.declarative import declarative_base


class NodePowerStatus(IntEnum):
    LINK_ALIVE = 3


class NodeAlignmentStatus(IntEnum):
    TX_RX_HEALTHY = 1


class NetworkTestHealth(Enum):
    EXCELLENT = 1
    GOOD = 2
    MARGINAL = 3
    POOR = 4


class StatHealth(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    POOR = "poor"
    UNKNOWN = "unknown"


Base: Any = declarative_base()


class NetworkStatsHealth(Base):
    __tablename__ = "network_stats_health"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(255), index=True, nullable=False)
    link_name = Column(String(255), nullable=True)
    node_name = Column(String(255), nullable=True)
    last_updated = Column(DateTime, server_default=func.now(), nullable=False)
    stats_health = Column(JSON, nullable=True)
