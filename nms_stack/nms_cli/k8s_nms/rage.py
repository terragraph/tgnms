#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import functools
import logging
import os
import re
import shutil
import subprocess
import sys
import time
from select import select
from typing import List, Optional


# Cache the logger
_logger = None
_context = None

_invocation_hooks = []

ansi_escape_ = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")


def register_invocation_hook(fn):
    """
    Add a function to be called each time a rage-tracked command is invoked. The
    function recives a logger as its only argument, which can be used to add
    additional information when commands are called.
    """
    _invocation_hooks.append(fn)


def run_subprocess_command(*args, **kwargs):
    """
    This runs a shell command using the 'subprocess' module, capturing its
    output to a log.
    """
    redirect_to_stderr = kwargs.pop("redirect_to_stderr", False)

    # Capture the stdout and stderr to Python instead of the terminal
    kwargs["stdout"] = subprocess.PIPE
    kwargs["stderr"] = subprocess.PIPE

    # We expect text to come out of the commands run
    kwargs["bufsize"] = 0
    kwargs["encoding"] = "utf-8"
    kwargs["text"] = True

    p = subprocess.Popen(*args, **kwargs)

    # Copied from https://stackoverflow.com/questions/31926470/run-command-and-get-its-stdout-stderr-separately-in-near-real-time-like-in-a-te
    real_stdout = sys.stdout.terminal
    real_stderr = sys.stderr.terminal
    readable = {
        p.stdout.fileno(): real_stdout.buffer,
        p.stderr.fileno(): real_stderr.buffer,
    }
    while readable:
        for fd in select(readable, [], [])[0]:
            # read available
            data = os.read(fd, 1024).decode("utf-8")
            if not data:
                # EOF
                del readable[fd]
            else:
                if fd == p.stdout.fileno():
                    if redirect_to_stderr:
                        sys.stderr.write(data)
                    else:
                        sys.stdout.write(data)
                else:
                    sys.stderr.write(data)

    # Sync up with the process to ensure it's done and get its return code
    p.communicate()
    if p.returncode != 0:
        raise RuntimeError(f"Subprocess exited with code {p.returncode}: {args}")


def get_next_file_name(base_dir) -> str:
    """
    Generate a file name of the current time (plus a number if its conflicting
    with an existing file)
    """
    timestr = time.strftime("%Y.%m.%d-%H.%M.%S")
    base_path = f"log_{timestr}"
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


class TtyLogger(object):
    """
    Utility class to override sys.(stdout|stderr).write(). We need this instead of a
    logging.StreamHandler() since we need to log stdout buffered by line instead
    of all at once once the program is finished.
    """

    def __init__(self, logger, terminal):
        self.terminal = terminal
        self.logger = logger

    def write(self, message):
        if not self.terminal.isatty():
            message = ansi_escape_.sub("", message)
        self.terminal.write(message)

        # Some libraries issue 2 calls to write() for a print, with the second
        # one being just '\n', so ignore that here
        if message != "\n" and message != "" and message != "".encode("utf-8"):
            self.logger.log(logging.INFO, ansi_escape_.sub("", message.rstrip()))

    def flush(self):
        self.terminal.flush()


def log(message):
    """
    Add some information to the log without printing it to stdout
    """
    get_logger().log(logging.INFO, message)


def log_command(base_dir):
    """
    Decorator to log a functions arguments and stdout
    """

    def decorator(fn):
        global _context
        _context = {"is_atty": sys.stdout.isatty()}

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

            # Erase stdout/stderr with out own logging version
            stdout_logger = TtyLogger(logger, sys.stdout)
            sys.stdout = stdout_logger
            stderr_logger = TtyLogger(logger, sys.stderr)
            sys.stderr = stderr_logger

            # Run the actual function
            result = fn(*args, **kwargs)

            # Restore the real stdout/stderr
            sys.stdout = stdout_logger.terminal
            sys.stderr = stderr_logger.terminal
            _context = None  # noqa
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
    if not os.path.exists(base_dir):
        return []

    files = [os.path.join(base_dir, path) for path in os.listdir(base_dir)]
    # TODO: Do we need Windows support? If so switch and use st_ctime
    # https://stackoverflow.com/questions/6759415/sorting-files-by-date
    files.sort(key=lambda x: os.stat(os.path.join(base_dir, x)).st_mtime)

    # Don't report all the files, just the N=limit latest
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
