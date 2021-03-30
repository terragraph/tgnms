#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from .create_query_tests import CreateQueryTests
from .fetch_stats_tests import FetchStatsTests
from .health_tests import HealthTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
