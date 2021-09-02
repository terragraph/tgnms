#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from typing import Any

from sqlalchemy import (
    Column,
    String,
    Integer,
)
from sqlalchemy.ext.declarative import declarative_base

Base: Any = declarative_base()


class CrashAnalysisResults(Base):
    __tablename__ = "crashlog_analysis_results"

    id = Column(Integer, primary_key=True)
    node_id = Column(String(255), nullable=False)
    crash_type = Column(String(255), nullable=False)
    crash_time = Column(String(255), nullable=False)
    application = Column(String(255), nullable=False)
    affected_function = Column(String(255), nullable=True)
    affected_lines = Column(String(10000), nullable=False)
