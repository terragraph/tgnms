#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging


class Logger:
    """
        Instantiates logger at a certain log level
    """

    def __init__(self, name: str, log_level: int) -> None:
        self.name: str = name
        self.log_level: int = log_level
        self.logger: logging = None

    def get_logger(self) -> logging:
        if not self.logger:
            _log = logging.getLogger(self.name)
            if not len(_log.handlers):
                _log.setLevel(self.log_level)
                hdlr = logging.StreamHandler()
                formatter = logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s: %(message)s"
                )
                hdlr.setFormatter(formatter)
                _log.addHandler(hdlr)
            _log.info(
                "Logger called with name {} and level {}".format(
                    self.name, self.log_level
                )
            )
            self.logger = _log
        return self.logger
