#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import logging
import unittest

from tests.connectivity_tests import ConnectivityTests
from tests.data_loader_tests import DataLoaderTests
from tests.hardware_config_tests import HardwareConfigTests
from tests.stats_tests import StatsTests
from tests.time_tests import TimeTests
from tests.topology_tests import TopologyTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
