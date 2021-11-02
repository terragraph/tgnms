#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
import sys
from typing import AnyStr, Dict, List, Optional, Tuple

sys.path.append("../")
try:
    from crashlog_analysis_service.utils.crash_analyzer import CrashAnalyzer, LogSource
    from crashlog_analysis_service.utils.vpp_crash_analyzer import VppCrashAnalyzer
    from crashlog_analysis_service.utils.crash_details import CrashDetails
except BaseException:
    raise

"""
Test class for VppCrashAnalyzer
"""

# stack trace log file path
STACK_TRACE_FILE_PATH = "./test_logs/e2e_minion-stack.4095.Tue_Mar_30_17_52_00_PDT_2021"

# vnet log file path
VNET_LOG_FILE_PATH = "./test_logs/vnet.log"

# fw error log file path
FW_ERROR_LOG_FILE_PATH = "./test_logs/fw_error_vnet.log"

# empty log file path
EMPTY_LOG_FILE_PATH = "./test_logs/empty_file.log"

# bad stack trace file path
# - Current thread does not have a stack trace
BAD_STACK_TRACE_FILE_PATH = "./test_logs/bad_stack_trace_e2e_minion.log"

# bad file path name
BAD_FILE_PATH = "./test_logs/this_file_does_not_exist.log"


class VppCrashAnalyzerTestCase(unittest.TestCase):
    def setUp(self):
        file_paths: List[str] = [
            STACK_TRACE_FILE_PATH,
            VNET_LOG_FILE_PATH,
            FW_ERROR_LOG_FILE_PATH,
            EMPTY_LOG_FILE_PATH,
            BAD_STACK_TRACE_FILE_PATH,
        ]
        self.file_path_to_lines: Dict[str, List[str]] = {}
        for file_path in file_paths:
            crash_file = open(file_path, "r")
            self.file_path_to_lines[file_path] = crash_file.readlines()
            crash_file.close()

    def test_parse_crash_stack_trace(self):
        # (file path, error msg) -> (len(test_res), len(test_res[0].affected_lines))
        test_cases: Dict[(str, str), (int, int)] = {
            (EMPTY_LOG_FILE_PATH, "dummy msg"): (0, 0),
            (VNET_LOG_FILE_PATH, "(SIGSEGV)"): (1, 15),
        }
        vppCrashAnalyzer = VppCrashAnalyzer()
        for test_file, error_msg in test_cases:
            exp_res_first, exp_res_second = test_cases[(test_file, error_msg)]
            test_res = vppCrashAnalyzer.find_error_msg(
                error_msg, self.file_path_to_lines[test_file], "", "", None
            )
            self.assertEqual(
                len(test_res) if test_res is not None else 0, exp_res_first
            )
            if test_res is not None and len(test_res) != 0:
                self.assertEqual(len(test_res[0].affected_lines), exp_res_second)

    def test_run_error_parsers(self):
        # file path -> len(test_res)
        test_cases: Dict[str, int] = {
            EMPTY_LOG_FILE_PATH: 0,
            # STACK_TRACE_FILE_PATH: 0,
            FW_ERROR_LOG_FILE_PATH: 1,
            VNET_LOG_FILE_PATH: 1,
        }
        vppCrashAnalyzer = VppCrashAnalyzer()
        for test_file in test_cases:
            exp_res = test_cases[test_file]
            test_res = vppCrashAnalyzer.run_error_parsers(
                log_source=LogSource.LOG_FILE,
                log_path=test_file,
                log_lines=self.file_path_to_lines[test_file],
                node_id="",
                application="",
                timestamp="",
            )
            self.assertEqual(len(test_res), exp_res)


if __name__ == "__main__":
    unittest.main()
