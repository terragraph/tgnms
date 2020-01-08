#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from tests.ecmp_toggle import EcmpToggle
from tests.routes_history import TestRoutesHistory


# from tests.routes_utilization import RoutesUtilization


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
