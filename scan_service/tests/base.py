#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from tests.adjacent_beam_index_tests import AdjacentBeamIndexTests
from tests.connectivity_tests import ConnectivityTests
from tests.data_loader import DataLoaderTests
from tests.topology_tests import TopologyTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
