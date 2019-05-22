#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import configure_django  # do not remove
import logging
import argparse

from api.flask_views import flask_view
from logger import Logger

_log = Logger(__name__, logging.INFO).get_logger()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="configure flask server")
    parser.add_argument(
        "--ip",
        "-i",
        action="store",
        default="0.0.0.0",
        help="IP address (default 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        "-p",
        action="store",
        default=8000,
        help="port (default 8000)",
    )
    try:
        args = vars(parser.parse_args())
    except BaseException:
        raise

    _log.info("Using ip {}, port {} ".format(args["ip"], args["port"]))
    flask_view(args["ip"], args["port"])
