#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import logging
import unittest

from tests.dict_utils_tests import DictUtilsTests
from tests.ip_utils_tests import IPUtilsTests
from tests.prometheus_tests import PrometheusClientTests
from tests.serialization_tests import SerializationTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
