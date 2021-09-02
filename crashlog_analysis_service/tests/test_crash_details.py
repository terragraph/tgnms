#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest
import sys
from typing import AnyStr, Dict, List, Optional, Tuple

sys.path.append("../")
try:
    from crashlog_analysis_service.utils.crash_details import CrashDetails
except BaseException:
    raise

"""
Test class for CrashDetails
"""


class CrashDetailsTestCase(unittest.TestCase):
    def setUp(self):
        self.crash1: CrashDetails = CrashDetails(
            "SIGSEGV", "11:22:33.444", "", "vnet", "function", ["line1", "line2"]
        )

    def test_init(self):
        self.assertEqual(self.crash1.crash_type, "SIGSEGV")
        self.assertEqual(self.crash1.application, "vnet")
        self.assertEqual(self.crash1.crash_time, "11:22:33.444")
        self.assertEqual(self.crash1.node_id, "")
        self.assertEqual(self.crash1.affected_function, "function")
        self.assertEqual(len(self.crash1.affected_lines), 2)

    def test_str(self):
        crash1_exp_key: str = (
            f"[Crash type]: SIGSEGV\n"
            + f"[Crash time]: 11:22:33.444\n"
            + f"[Node ID]: \n"
            + f"[Application type:] vnet\n"
            + f"[Affected function name]: function\n"
            + f"[Affected lines]:\n"
            + f"line1line2\n"
        )
        self.assertEqual(self.crash1.__str__(), crash1_exp_key)


if __name__ == "__main__":
    unittest.main()
