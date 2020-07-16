#!/usr/bin/env python3
# Copyright (c) 2014-present, Facebook, Inc.

import contextlib
import functools
import inspect
import io
import logging
import os
import re
import shutil
import sys
import time
from typing import List, Optional


# Cache the logger
_logger = None

_invocation_hooks = []

# Taken from https://stackoverflow.com/questions/14693701/how-can-i-remove-the-ansi-escape-sequences-from-a-string-in-python/33925425
_ansi_color_code = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")


def register_invocation_hook(fn):
    _invocation_hooks.append(fn)


def get_next_file_name(base_dir) -> str:
    timestr = time.strftime("%Y.%m.%d-%H.%M.%S")
    base_path = f"nms_log_{timestr}"
    path = base_path

    # If for some reason this log already exists, append a number
    num = 1
    while os.path.exists(os.path.join(base_dir, path)):
        path = f"{base_path}_{num}"
        num += 1

    return os.path.join(base_dir, path)


def get_logger(base_dir: Optional[str] = None) -> logging.Logger:
    """
    Get a logger that will report to a file inside of base_dir
    """
    global _logger
    if _logger is None:
        if base_dir is None:
            raise RuntimeError("Logger was uninitialized, base_dir is required")
        if not os.path.exists(base_dir):
            os.mkdir(base_dir)

        _logger = logging.getLogger(__name__)
        _logger.setLevel(logging.DEBUG)

        f_handler = logging.FileHandler(get_next_file_name(base_dir))
        f_handler.setLevel(logging.DEBUG)

        formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")
        f_handler.setFormatter(formatter)

        _logger.addHandler(f_handler)
    return _logger


class StdoutLogger(object):
    """
    Utility class to override sys.stdout.write(). We need this instead of a
    logging.StreamHandler() since we need to log stdout buffered by line instead
    of all at once once the program is finished.
    """

    def __init__(self, logger):
        self.terminal = sys.stdout
        self.logger = logger

    def is_relevant_frame(self, frame):
        info = inspect.getframeinfo(frame)
        if info.filename is None:
            return False

        # We only care about the nms_stack library
        if "nms/nms_stack/nms_cli" not in info.filename:
            return False

        # Ignore logs from this file
        return not info.filename.endswith("rage.py")

    def get_last_relevant_frame(self):
        """
        Get the topmost stack frame that is coming from the nms library
        """
        frame = inspect.currentframe().f_back

        while not self.is_relevant_frame(frame):
            frame = frame.f_back

        return inspect.getframeinfo(frame)

    def write(self, message):
        info = self.get_last_relevant_frame()

        self.terminal.write(message)

        # Some libraries issue 2 calls to write() for a print, with the second
        # one being just '\n', so ignore that here
        if message != "\n" and message != "" and message != "".encode("utf-8"):
            self.logger.log(logging.INFO, f"{info.filename}:{info.lineno} {message}")

    def flush(self):
        pass


def remove_ansi(string: str) -> str:
    return _ansi_color_code.sub("", string)


def log_command(base_dir):
    """
    Decorator to log a functions arguments and stdout
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # initialize logger
            logger = get_logger(base_dir)

            # Log command line args
            record_invocation()

            # Log the args passed to the function
            logger.log(
                logging.DEBUG,
                f"Function called with args: {str(args)} and kwargs {str(kwargs)}",
            )

            # Erase stdout with out own logging version
            stdout_logger = StdoutLogger(logger)
            sys.stdout = stdout_logger

            # Run the function
            result = fn(*args, **kwargs)

            # Restore the real stdout
            sys.stdout = stdout_logger.terminal
            return result

        return wrapper

    return decorator


def record_invocation() -> None:
    """
    Decorator to log info about Python environment and command line args
    """
    get_logger().log(logging.DEBUG, "New command invocation")
    get_logger().log(logging.DEBUG, sys.executable)
    get_logger().log(logging.DEBUG, sys.version_info)
    get_logger().log(logging.DEBUG, f"Invoked with: {sys.argv}")

    for hook in _invocation_hooks:
        hook(get_logger())


def gather_files(base_dir, limit) -> List[str]:
    """
    Collect file names for a rage report (sorted by file mtime)
    """
    files = [os.path.join(base_dir, path) for path in os.listdir(base_dir)]
    # TODO: Do we need Windows support? If so switch and use st_ctime
    # https://stackoverflow.com/questions/6759415/sorting-files-by-date
    files.sort(key=lambda x: os.stat(os.path.join(base_dir, x)).st_mtime)

    # Don't report all the files, just the NUM_LOGS_TO_REPORT latest
    return files[-limit:]


def clean(base_dir) -> None:
    print(
        f"This will remove all the log files in {base_dir}, do you want to continue? (Y/n)",
        end=" ",
    )
    choice = input().lower()
    if choice == "y":
        if os.path.exists(base_dir):
            shutil.rmtree(base_dir)
