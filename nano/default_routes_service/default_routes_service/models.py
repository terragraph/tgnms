#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()  # type: Any


class DefaultRouteHistory(Base):
    __tablename__ = "default_route_history"

    id = Column(Integer, primary_key=True)
    topology_name = Column(String(100))
    node_name = Column(String(255))
    last_updated = Column(DateTime, default=datetime.datetime.now())
    routes = Column(JSON)
    is_ecmp = Column(Boolean)
    hop_count = Column(Integer)


class DefaultRouteCurrent(Base):
    __tablename__ = "default_route_current"

    id = Column(Integer, primary_key=True)
    topology_name = Column(String(100))
    node_name = Column(String(255))
    last_updated = Column(DateTime, default=datetime.datetime.now())
    current_route_id = Column(Integer, ForeignKey("default_route_history.id"))
