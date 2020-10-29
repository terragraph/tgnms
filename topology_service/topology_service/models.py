#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base: Any = declarative_base()


class TopologyHistory(Base):
    __tablename__ = "topology_history"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(255), index=True, nullable=False)
    topology = Column(JSON, nullable=False)
    last_updated = Column(DateTime, index=True, nullable=False)
