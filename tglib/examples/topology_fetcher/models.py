#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved

from sqlalchemy import JSON, Column, DateTime, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class Topology(Base):
    __tablename__ = "topology"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    topo = Column(JSON)
    datetime = Column(DateTime)
