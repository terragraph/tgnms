#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import logging
import os
import re
import sys

from .crash_details import CrashDetails
from enum import IntEnum
from typing import AnyStr, Dict, List, Optional, Tuple
from re import Match

"""
Module for analyzing, storing, and summarizing
information about various crash logs
"""

LOG = logging.getLogger(__name__)

# Stack trace terminated signal line format
# Program terminated with signal [SIGNAL],
#                                 group(1)
STACK_TRACE_TERMINATED_SIGNAL_RE = re.compile("Program terminated with signal (.+),")

# Stack trace lines format
# [line #] [address] in [function name] () from [log path]
#           group(1)      group(2)                group(5)
STACK_TRACE_LINE_RE = re.compile(
    "^#\d+\s+([0-9a-fA-FxX]*)\s+in\s+(.+)\s+\(\)(\s+)?(from)?(.+)?"
)

# Current thread format
CURRENT_THREAD_RE = re.compile("Current thread is (\d+)")

# Timestamp format
# [hr]:[min]:[sec].[decimal seconds]
TIMESTAMP_RE = re.compile("(\d\d):(\d\d):(\d\d)\.(\d+)")

# File path timestamp format
FILE_PATH_TIMESTAMP_RE = re.compile("(\d\d).(\d\d).(\d\d).([a-zA-Z]+)")

STACK_TRACE_CONTENT_MARKER = "Dumping stack trace file"


class LogSource(IntEnum):
    """List of possible log sources."""

    LOG_FILE = 1
    ELASTICSEARCH = 2


class CrashAnalyzer:

    # Error message regex
    # regex group(1) is the error code
    ERROR_MSGS_RE: List[str] = [
        "(SIGABRT)",
        "(SIGSEGV)",
        "Check (failure) stack trace",
        "Terminated due to exception (\w*)",
    ]

    @staticmethod
    def extract_time(maybe_time_str: str) -> Optional[str]:
        """Given a string that potentially contains a timestamp,
        extract and return the timestamp as a string. If no
        timestamp is found, return None.
        """
        match = TIMESTAMP_RE.search(maybe_time_str)
        if match is not None:
            return match.group()
        return None

    @staticmethod
    def extract_time_from_log_path(log_path: str) -> str:
        """Given a log path/name, extract a timestamp from it
        and return the timestamp as a string. If no timestamp is found,
        return None.
        """
        match = FILE_PATH_TIMESTAMP_RE.search(log_path)
        if match is not None:
            return f"{match.group(1)}:{match.group(2)}:{match.group(3)}"
        return ""

    @staticmethod
    def extract_function_name(maybe_function_str: str) -> Optional[str]:
        """Given a string that potentially contains a function name,
        extract and return the function name as a string. If no
        function name is found, return None.
        """
        match = STACK_TRACE_LINE_RE.search(maybe_function_str)
        if match is not None:
            return match.group(2)
        return None

    @staticmethod
    def extract_current_thread(maybe_thread_str: str) -> Optional[str]:
        """Given a string that potentially contains the current thread,
        extract and return the current thread as a string. If no
        thread is found, return None.
        """
        match = CURRENT_THREAD_RE.search(maybe_thread_str)
        if match is not None:
            return match.group(1)
        return None

    def _extract_thread_stack_trace(
        self, thread: str, lines: List[str]
    ) -> Optional[List[str]]:
        """Given a thread and a list of stack trace lines,
        extract the stack trace that corresponds to the
        thread. If the thread stack trace is not found, return None.
        """
        thread_str = f"Thread {thread} "
        i: int = 0
        while i < len(lines) and thread_str not in lines[i]:
            i += 1
        if i != len(lines) and thread_str in lines[i]:
            j: int = i
            while j < len(lines) and lines[j] != "\n":
                j += 1
            start = i - 1
            end = j
            return lines[start:end]
        return None

    def parse_stack_trace_log(
        self,
        log_lines: List[str],
        node_id: str,
        application: str,
        crash_time: str,
        num_lines_before: int = 25,
        num_lines_after: int = 5,
    ) -> Optional[CrashDetails]:
        """Assume the list of log lines are from
        an application stack trace log and parse for relevant
        errors. If successful, return a CrashDetails
        containing relevant thread stack trace lines.
        Else, return None.
        """
        crash_type: Optional[str] = None
        function_name: Optional[str] = None
        current_thread: Optional[str] = None
        affected_lines: List[str] = []
        match: Optional[Match[str]] = None
        i: int = 0
        # Look for the signal/crash type

        while match is None and i < len(log_lines):
            match = STACK_TRACE_TERMINATED_SIGNAL_RE.match(log_lines[i])
            i += 1
        if match is not None:
            # Found signal/crash type
            crash_type = match.group(1)
            # Get the surrounding lines
            start = max(0, i - num_lines_before)
            end = i + num_lines_after
            affected_lines = log_lines[start:end]
            # Extract function name from the next stack trace line
            function_name = self.extract_function_name(maybe_function_str=log_lines[i])
            # Extract the current thread and its stack trace
            current_thread = self.extract_current_thread(
                maybe_thread_str=log_lines[i + 1]
            )
            if current_thread is not None:
                # Update the affected lines with the current thread's stack trace
                thread_stack_trace = self._extract_thread_stack_trace(
                    thread=current_thread, lines=log_lines
                )
                if thread_stack_trace is not None:
                    affected_lines = thread_stack_trace
            # Try to extract a specific crash time
            specific_crash_time = self.extract_time(maybe_time_str=log_lines[i - 1])
            crash_time = (
                specific_crash_time if specific_crash_time is not None else crash_time
            )
            return CrashDetails(
                crash_type=crash_type,
                crash_time=crash_time,
                node_id=node_id,
                application=application,
                affected_function=function_name,
                affected_lines=affected_lines,
            )
        return None

    def extract_stack_trace_logs(
        self, log_lines: List[str], application: str
    ) -> List[str]:
        """Extract the lines containing the crash stack trace contents
        added to the application log."""

        # Search for the known crash/stack file marker
        LOG.debug(f"Extracting crash stack traces from {application} log")
        for idx, log in enumerate(log_lines):
            # This marker is only present in non-VPP application logs. VPP has its own CrashAnalyzer.
            if STACK_TRACE_CONTENT_MARKER in log:
                # Strip away whitespace markers inserted for multi-line logs
                stack_lines = [line.lstrip() for line in log_lines[idx].splitlines()]
                LOG.info(
                    f"Found stack trace in {application} log with {len(stack_lines)} lines"
                )
                return stack_lines

        return []

    def parse_crash_stack_trace(
        self,
        crash_type: str,
        maybe_stack_trace: List[str],
        node_id: str,
        application: str,
    ) -> Optional[CrashDetails]:
        """Parse the application specific crash stack trace.
        Subclasses should override this method with application
        specific parsing. Many application logs don't contain
        stack traces so this method returns None.
        """
        return None

    def find_error_msg(
        self,
        error_msg_re_str: str,
        log_lines: List[str],
        node_id: str,
        application: str,
        crash_time: str,
        num_lines_before: int = 25,
        num_lines_after: int = 5,
    ) -> List[CrashDetails]:
        """Search for given error messages in an application log.
        Returns a list of CrashDetails, if any crashes are found.
        """
        found_errors: List[CrashDetails] = []
        error_msg_re = re.compile(error_msg_re_str)
        for i in range(0, len(log_lines)):
            match = error_msg_re.search(log_lines[i])
            if match is not None:
                # Try to extract a stack trace from the lines surrounding the error message
                start = i + 1
                end = i + 20
                maybe_crash_details = self.parse_crash_stack_trace(
                    crash_type=match.group(1),
                    maybe_stack_trace=log_lines[start:end],
                    node_id=node_id,
                    application=application,
                )
                if maybe_crash_details is not None:
                    found_errors.append(maybe_crash_details)
                else:
                    # Try to extract a specific crash time from the line
                    specific_crash_time = self.extract_time(maybe_time_str=log_lines[i])
                    crash_time = (
                        specific_crash_time
                        if specific_crash_time is not None
                        else crash_time
                    )
                    # Found error code - return the surrounding lines
                    error_msg = match.group(1)
                    start = max(0, i - num_lines_before)
                    end = i + num_lines_after
                    found_errors.append(
                        CrashDetails(
                            crash_type=error_msg,
                            crash_time=crash_time,
                            node_id=node_id,
                            application=application,
                            affected_function=None,
                            affected_lines=log_lines[start:end],
                        )
                    )
        return found_errors

    def run_error_parsers(
        self,
        log_source: LogSource,
        log_path: str,
        log_lines: List[str],
        node_id: str,
        application: str,
        timestamp: str,
    ) -> List[CrashDetails]:
        """Given a list of log lines, run a series of parsers to extract
        crash and error message related information. Returns a list
        of CrashDetails on each found crash and/or error message.
        """
        found_crashes: List[CrashDetails] = []

        if log_source == LogSource.LOG_FILE:
            stack_trace_lines = log_lines
            crash_time = self.extract_time_from_log_path(log_path=log_path)
        # For ES, extract stack traces from the application log
        elif log_source == LogSource.ELASTICSEARCH:
            stack_trace_lines = self.extract_stack_trace_logs(
                log_lines=log_lines, application=application
            )
            crash_time = timestamp

        if stack_trace_lines:
            # Now parse the stack trace for useful CrashDetails
            crash_details = self.parse_stack_trace_log(
                log_lines=stack_trace_lines,
                node_id=node_id,
                application=application,
                crash_time=crash_time,
            )

            # If the parsing was successful, add to found_crashes
            if crash_details is not None and crash_details.crash_type is not None:
                LOG.info(
                    f"Parsed and found crashes in stack trace logs \n: {crash_details}"
                )
                found_crashes.append(crash_details)
        else:
            # No stack trace information found
            LOG.debug(f"{node_id}/{log_path} did not parse crash stack traces.")

        # If there are no crashes found yet,
        # Parsing was unsuccessful
        # then look for specific error messages and append CrashDetails
        # containing the surrounding lines or stack traces caused by the error messages

        if not found_crashes:
            LOG.debug(
                f"{node_id}/{log_path} log did not have crash stack traces. Trying to find error messages"
            )
            for error_msg_re_str in self.ERROR_MSGS_RE:
                found_crashes.extend(
                    self.find_error_msg(
                        error_msg_re_str=error_msg_re_str,
                        log_lines=log_lines,
                        node_id=node_id,
                        application=application,
                        crash_time=crash_time,
                    )
                )

        return found_crashes
