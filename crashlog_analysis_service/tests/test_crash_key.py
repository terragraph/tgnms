#!/usr/bin/env python3

"""
Copyright (c) Facebook, Inc. and its affiliates.
All rights reserved.
"""

"""
Test class for CrashKey
"""

import unittest
import sys

sys.path.append("../")
try:
  import crash_analysis_runner

  from crash_details import CrashDetails
  from crash_key import CrashKey
except BaseException:
  raise

from typing import AnyStr, Dict, List, Optional, Tuple

class CrashKeyTestCase(unittest.TestCase):

  def setUp(self):
    self.key1: CrashKey = CrashKey(crash_type="SIGSEGV", application="vnet")
    self.key2: CrashKey = CrashKey(crash_type="SIGSEGV", application="vnet")
    self.key3: CrashKey = CrashKey(crash_type="SIGABRT", application="e2e_minion")
    self.key4: CrashKey = CrashKey()

  def test_init(self):
    self.assertEqual(self.key1.crash_type, "SIGSEGV")
    self.assertEqual(self.key1.application, "vnet")
    self.assertEqual(self.key1.crash_time, None)
    self.assertEqual(self.key1.node_id, None)

  def test_eq(self):
    self.assertTrue(self.key1.__eq__(self.key2))
    self.assertFalse(self.key1.__eq__(self.key3))

  def test_str(self):
    self.assertEqual(self.key1.__str__(), "[ -- Crash type: SIGSEGV -- Application: vnet -- ]")
    self.assertEqual(self.key3.__str__(), "[ -- Crash type: SIGABRT -- Application: e2e_minion -- ]")
    self.assertEqual(self.key4.__str__(), "[ -- ]")

  def test_create_key_from_base(self):
    crash_detail: CrashDetails = CrashDetails("SIGSEGV", "11:22:33.444", "", "vnet", "function" , [])
    crash_key: CrashKey = self.key1.create_key_from_base(crash_detail)
    self.assertEqual(crash_key.application, "vnet")
    self.assertEqual(crash_key.crash_type, "SIGSEGV")
    self.assertEqual(crash_key.crash_time, None)
    self.assertEqual(crash_key.node_id, None)

if __name__ == '__main__':
    unittest.main()
