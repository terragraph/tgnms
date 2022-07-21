#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
