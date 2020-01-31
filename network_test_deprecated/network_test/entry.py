#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import configure_django  # do not remove
import logging
import argparse

from api.flask_views import flask_view, networktest_routes
from logger import Logger
from tglib.tglib import Client, init

_log = Logger(__name__, logging.INFO).get_logger()


async def main() -> None:
    flask_view()


if __name__ == "__main__":
    """Pass in the 'main' function, a set of clients, and 'routes' into 'init'."""
    init(lambda: main(), {Client.PROMETHEUS_CLIENT}, networktest_routes)
