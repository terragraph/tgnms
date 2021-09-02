#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
import sys
from typing import AnyStr, Dict, List, Optional, Tuple

sys.path.append("../")
try:
    from crashlog_analysis_service.utils.crash_analyzer import CrashAnalyzer
    from crashlog_analysis_service.utils.crash_details import CrashDetails
except BaseException:
    raise

"""
Test class for CrashAnalyzer
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


class CrashAnalyzerTestCase(unittest.TestCase):
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
        crash_file = open(STACK_TRACE_FILE_PATH, "r")
        self.stack_trace_lines: List[str] = crash_file.readlines()
        crash_file.close()

    def test_extract_time(self):
        test_cases: Dict[str, Optional[str]] = {
            "extra_text_12:42:41.123456abcd": "12:42:41.123456",
            "extra_text_12:4a:41.123456abcd": None,
            "extra_text_12:42:41:123456abcd": None,
            "212:42:41.123456abcd": "12:42:41.123456",
        }
        crashAnalyzer = CrashAnalyzer()
        for test_str in test_cases:
            exp_res = test_cases[test_str]
            test_res = crashAnalyzer.extract_time(test_str)
            self.assertEqual(test_res, exp_res)

    def test_extract_time_from_log_path(self):
        test_cases: Dict[str, Optional[str]] = {
            "openr-stack.30500.Fri_Jun_11_16_31_50_UTC_2021": "16:31:50",
            "openr-stack.30500.Fri_Jun_11_16/31/50/UTC_2021": "16:31:50",
            "openr-stack.30500.Fri_Jun_11_16_31_50_20_123_2021": "",
        }
        crashAnalyzer = CrashAnalyzer()
        for test_str in test_cases:
            exp_res = test_cases[test_str]
            test_res = crashAnalyzer.extract_time_from_log_path(test_str)
            self.assertEqual(test_res, exp_res)

    def test_extract_function_name(self):
        test_cases: Dict[str, Optional[str]] = {
            "#0  0x0000ffffa89f9560 in raise () from /lib/libc.so.6": "raise",
            "#4  0x0000ffffa9e07f8c in ?? () from /usr/lib/libopenrlib.so.1": "??",
            "#4  0x0000ffffa9e07f8c in ?? ()": "??",
            "4  0x0000ffffa9e07f8c in ?? ()": None,
            "#4  0x0000ffffa9e07f8c in ??()": None,
            "#4  0x0000ffffa9e07f8c! in ?? ()": None,
        }
        crashAnalyzer = CrashAnalyzer()
        for test_str in test_cases:
            exp_res = test_cases[test_str]
            test_res = crashAnalyzer.extract_function_name(test_str)
            self.assertEqual(test_res, exp_res)

    def test_extract_current_thread(self):
        test_cases: Dict[str, Optional[str]] = {
            "Current thread is 123": "123",
            "Current thread is 1": "1",
            "Current thread is abc": None,
            "": None,
        }
        crashAnalyzer = CrashAnalyzer()
        for test_str in test_cases:
            exp_res = test_cases[test_str]
            test_res = crashAnalyzer.extract_current_thread(test_str)
            self.assertEqual(test_res, exp_res)

    def test_extract_thread_stack_trace(self):
        test_cases: Dict[str, int] = {"1": 34, "15": 21, "20": 0, "abc": 0}
        crashAnalyzer = CrashAnalyzer()
        for test_thread in test_cases:
            exp_res = test_cases[test_thread]
            test_res = crashAnalyzer._extract_thread_stack_trace(
                test_thread, self.stack_trace_lines
            )
            self.assertEqual(len([] if test_res is None else test_res), exp_res)

    def test_parse_stack_trace_log(self):
        # filepath -> len(test_res.affected_lines)
        test_cases: Dict[str, int] = {
            EMPTY_LOG_FILE_PATH: 0,
            BAD_STACK_TRACE_FILE_PATH: 24,
            STACK_TRACE_FILE_PATH: 34,
        }
        crashAnalyzer = CrashAnalyzer()
        for test_file in test_cases:
            exp_res = test_cases[test_file]
            lines = []
            with open(test_file, "r") as crash_file:
                lines = crash_file.readlines()
            test_res = crashAnalyzer.parse_stack_trace_log(lines, "", "", None)
            self.assertEqual(
                len([] if test_res is None else test_res.affected_lines), exp_res
            )

    def test_find_error_msg(self):
        # (file path, error msg) -> (len(test_res), len(test_res[0].affected_lines))
        test_cases: Dict[(str, str), (int, int)] = {
            (EMPTY_LOG_FILE_PATH, "dummy msg"): (0, 0),
            (FW_ERROR_LOG_FILE_PATH, "(Firmware error) detected, assert codes"): (
                1,
                29,
            ),
        }
        crashAnalyzer = CrashAnalyzer()
        for test_file, error_msg in test_cases:
            exp_res_first, exp_res_second = test_cases[(test_file, error_msg)]
            lines = []
            with open(test_file, "r") as crash_file:
                lines = crash_file.readlines()
            test_res = crashAnalyzer.find_error_msg(error_msg, lines, "", "", None)
            self.assertEqual(len(test_res), exp_res_first)
            if len(test_res) != 0:
                self.assertEqual(len(test_res[0].affected_lines), exp_res_second)

    def test_run_error_parsers(self):
        # file path -> len(test_res)
        test_cases: Dict[str, int] = {
            EMPTY_LOG_FILE_PATH: 0,
            STACK_TRACE_FILE_PATH: 1,
            FW_ERROR_LOG_FILE_PATH: 0,
        }
        crashAnalyzer = CrashAnalyzer()
        for test_file in test_cases:
            exp_res = test_cases[test_file]
            test_res = crashAnalyzer.run_error_parsers(
                test_file, self.file_path_to_lines[test_file], "", ""
            )
            self.assertEqual(len(test_res), exp_res)


if __name__ == "__main__":
    unittest.main()
