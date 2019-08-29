#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

from sqlalchemy import JSON, Column, ForeignKey, Integer, String
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()


class Controller(Base):
    __tablename__ = "controller"

    id = Column(Integer, primary_key=True)
    api_ip = Column(String(255))
    api_port = Column(Integer)
    e2e_ip = Column(String(255))
    e2e_port = Column(Integer)


class Topology(Base):
    __tablename__ = "topology"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    primary_controller = Column(Integer, ForeignKey("controller.id"))
    backup_controller = Column(Integer, ForeignKey("controller.id"))
    site_overrides = Column(JSON)
    wireless_controller = Column(Integer)
    offline_whitelist = Column(JSON)
