#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from tests.cns_powered_off_tests import VisibilityUtilsTest
from tests.link_insight_tests import LinkInsightTests
from tests.math_utils_tests import MathUtilsTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
