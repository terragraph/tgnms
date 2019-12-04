#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()  # type: Any


class Topology(Base):
    __tablename__ = "topology"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    topology = Column(JSON)
    datetime = Column(DateTime, default=datetime.datetime.now())
