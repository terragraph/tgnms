#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base: Any = declarative_base()


class DefaultRoutesHistory(Base):
    __tablename__ = "default_routes_history"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(100), index=True, nullable=False)
    node_name = Column(String(255), index=True, nullable=False)
    last_updated = Column(DateTime, index=True, nullable=False)
    routes = Column(JSON, nullable=False)
    max_hop_count = Column(Integer, nullable=False)


class CnEgressRoutesHistory(Base):
    __tablename__ = "cn_egress_routes_history"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(100), index=True, nullable=False)
    link_name = Column(String(255), index=True, nullable=False)
    last_updated = Column(DateTime, index=True, nullable=False)
    routes = Column(JSON, nullable=False)
