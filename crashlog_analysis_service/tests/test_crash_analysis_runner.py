#!/usr/bin/env python3

"""
Copyright (c) Facebook, Inc. and its affiliates.
All rights reserved.
"""

"""
Test class for CrashAnalysisRunner
"""

import unittest
import sys

sys.path.append("../utils/")
try:
  import crash_analysis_runner

  from crash_analyzer import CrashAnalyzer
  from vpp_crash_analyzer import VppCrashAnalyzer
  from crash_details import CrashDetails
  from crash_key import CrashKey
except BaseException:
    raise

from typing import AnyStr, Dict, List, Optional, Tuple

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

class CrashAnalysisRunnerTestCase(unittest.TestCase):

  def setUp(self):
    file_paths: List[str] = [
      STACK_TRACE_FILE_PATH,
      VNET_LOG_FILE_PATH,
      FW_ERROR_LOG_FILE_PATH,
      EMPTY_LOG_FILE_PATH,
      BAD_STACK_TRACE_FILE_PATH
    ]
    self.file_path_to_lines: Dict[str, List[str]] = {}
    for file_path in file_paths:
      crash_file = open(file_path, 'r')
      self.file_path_to_lines[file_path] = crash_file.readlines()
      crash_file.close()

  def test_extract_application_type(self):
    # filepath -> expected application type
    test_cases: Dict[str, str] = {
      EMPTY_LOG_FILE_PATH: "",
      BAD_FILE_PATH: "",
      BAD_STACK_TRACE_FILE_PATH: "e2e_minion",
      FW_ERROR_LOG_FILE_PATH: "vnet",
      VNET_LOG_FILE_PATH: "vnet",
      STACK_TRACE_FILE_PATH: "e2e_minion"
    }
    for test_file_path in test_cases:
      exp_application_type = test_cases[test_file_path]
      test_res = crash_analysis_runner.extract_application_type(test_file_path)
      self.assertEqual(test_res, exp_application_type)

  def test_analyze_log(self):
    # file path -> len(test_res)
    test_cases: Dict[str, int] = {
      EMPTY_LOG_FILE_PATH: 0,
      BAD_STACK_TRACE_FILE_PATH: 1,
      VNET_LOG_FILE_PATH: 1,
      STACK_TRACE_FILE_PATH: 1,
      FW_ERROR_LOG_FILE_PATH: 1
    }
    for test_file in test_cases:
      exp_res = test_cases[test_file]
      test_res = crash_analysis_runner.analyze_log(self.file_path_to_lines[test_file],test_file)
    #print(test_file)
      self.assertEqual(len(test_res), exp_res)

  def test_group_crashes(self):
    test_files: List[str] = [
      VNET_LOG_FILE_PATH,
      STACK_TRACE_FILE_PATH,
      # to incur a duplicate crash for grouping
      STACK_TRACE_FILE_PATH,
      FW_ERROR_LOG_FILE_PATH,
      BAD_STACK_TRACE_FILE_PATH
    ]
    crashes = []
    for test_file in test_files:
      crashes.extend(crash_analysis_runner.analyze_log(self.file_path_to_lines[test_file], test_file))
    # base crash key -> len(test_res_groups)
    test_cases: Dict[CrashKey, int] = {
      # Test group by application
      CrashKey(application=""): 2,
      # Test group by crash type
      CrashKey(crash_type=""): 3,
      # Test group by time
      CrashKey(crash_time=""): 3,
      # Test group by node id
      CrashKey(node_id=""): 1,
      # Test group by application and crash type
      CrashKey(application="", crash_type=""): 3,
      # Test group by application, crash type, and time
      CrashKey(application="", crash_type="", crash_time=""): 3,
    }
    for base_key in test_cases:
      exp_res = test_cases[base_key]
      test_res_groups = crash_analysis_runner.group_crashes(crashes, base_key)
      self.assertEqual(len(test_res_groups), exp_res)


if __name__ == '__main__':
    unittest.main()
