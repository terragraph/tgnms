#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from tests.config_operations_tests import ConfigOperationsTests
from tests.graph_analysis_tests import GraphAnalysisTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
