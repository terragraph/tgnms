#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import logging
import unittest

from tests.auto_remediation_tests import (
    AutoRemediationTests,
    LinkOperationTests,
    BackupLinksSelectionTests,
)
from tests.config_operations_tests import ConfigOperationsTests
from tests.dict_deep_update_tests import DictDeepUpdateTests
from tests.fetch_scan_stats_tests import FetchScanStatsTests
from tests.flow_graph_tests import FlowGraphTests
from tests.graph_analysis_tests import GraphAnalysisTests

if __name__ == "__main__":
    # Suppress logging statements during tests
    logging.disable(logging.CRITICAL)

    # Run all tests
    unittest.main()
