#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import os
import re
import sys

from .crash_analyzer import CrashAnalyzer, LogSource
from .crash_details import CrashDetails
from typing import AnyStr, Dict, List, Optional, Tuple
from re import Match

"""
Module to analyze and summarize VPP crash logs and stack traces
"""

# VPP log stack trace line format
# [meta-data]: [stack line #] [stack addr] [function name] + [offset]
#                               group(1)      group(2)       group(3)
VNET_LOG_STACK_TRACE_RE = "^.*:\s+#\d+\s+([0-9a-fA-FxX]*)\s+(\w+)\s+\+?\s?(\w+)?"


class VppCrashAnalyzer(CrashAnalyzer):

    # Error message regex
    # regex group(1) is the error code
    ERROR_MSGS_RE: List[str] = [
        # ---- from "vnet.log" ----
        "(Firmware error) detected, assert codes",
        "(Firmware not ready)",
        "(SIGSEGV)",
        "(SIGABRT)",
        "(deadlock)",
    ]

    def parse_stack_trace_log(
        self,
        log_lines: List[str],
        node_id: str,
        application: str,
        crash_time: Optional[str],
        num_lines_before: int = 25,
        num_lines_after: int = 5,
    ) -> Optional[CrashDetails]:
        """Application stack trace logs for VPP do not contain
        useful information so return None.
        """
        return None

    def parse_crash_stack_trace(
        self,
        crash_type: str,
        maybe_stack_trace: List[str],
        node_id: str,
        application: str,
    ) -> Optional[CrashDetails]:
        """Given the remaining lines after an error code is found,
        parse with the vnet log stack trace format. If lines are a
        valid stack trace, return a CrashDetails containing the relevant
        stack lines and information. Otherwise, return None.
        """
        if (
            len(maybe_stack_trace) == 0
            or re.match(VNET_LOG_STACK_TRACE_RE, maybe_stack_trace[0]) is None
        ):
            return None
        function_name: Optional[str] = None
        crash_time: Optional[str] = None
        stack_trace: List[str] = []
        for line in maybe_stack_trace:
            # Compare and match with the vpp stack trace regex
            match = re.match(VNET_LOG_STACK_TRACE_RE, line)
            if match is None:
                # Done with stack trace
                break
            if function_name is None and match.group(3) is not None:
                # Extract the function name if there is an offset group
                function_name = match.group(2)
            if crash_time is None:
                # Extract the crash time
                crash_time = super().extract_time(maybe_time_str=line)
            stack_trace.append(line)
        return CrashDetails(
            crash_type=crash_type,
            crash_time=("" if crash_time is None else crash_time),
            node_id=node_id,
            application=application,
            affected_function=function_name,
            affected_lines=stack_trace,
        )

    def run_error_parsers(
        self,
        log_source: LogSource,
        log_path: str,
        log_lines: List[str],
        node_id: str,
        application: str,
        timestamp: str,
    ) -> List[CrashDetails]:
        """Given a list of VPP vnet log lines that may contain the VPP stack trace, find
        error messages and extract stack traces if possible. Please note that
        VPP stack content from gdb are not present in the application log. Returns a list
        of CrashDetails on each found crash and/or error message.
        """
        found_crashes: List[CrashDetails] = []
        crash_time = self.extract_time_from_log_path(log_path=log_path)

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
