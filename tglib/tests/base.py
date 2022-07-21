#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import logging
import unittest

from tests.dict_utils_tests import DictUtilsTests
from tests.ip_utils_tests import IPUtilsTests
from tests.prometheus_tests import PrometheusClientTests
from tests.thrift_tests import ThriftTests


if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
