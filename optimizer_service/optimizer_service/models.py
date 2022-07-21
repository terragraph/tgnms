#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
