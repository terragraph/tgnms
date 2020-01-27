#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

from typing import Any

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.ext.declarative import declarative_base


Base: Any = declarative_base()


class DefaultRouteHistory(Base):
    __tablename__ = "default_route_history"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(100), index=True, nullable=False)
    node_name = Column(String(255), index=True, nullable=False)
    last_updated = Column(
        DateTime, server_default=func.now(), index=True, nullable=False
    )
    routes = Column(JSON, nullable=False)
    hop_count = Column(Integer, nullable=False)
    prev_routes_id = Column(
        Integer,
        ForeignKey("default_route_history.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )


class LinkCnRoutes(Base):
    __tablename__ = "link_cn_routes"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(100), index=True, nullable=False)
    link_name = Column(String(255), index=True, nullable=False)
    last_updated = Column(
        DateTime, server_default=func.now(), index=True, nullable=False
    )
    cn_routes = Column(JSON, nullable=False)
