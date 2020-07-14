#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

from typing import Any

from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base: Any = declarative_base()


class CutEdgeOverridesConfig(Base):
    __tablename__ = "cut_edge_overrides_config"

    id = Column(Integer, primary_key=True)
    network_name = Column(String(255), index=True, nullable=False)
    node_name = Column(String(255), index=True, nullable=False)
    link_flap_backoff_ms = Column(String(255), nullable=True)
    link_impairment_detection = Column(Integer, nullable=True)
