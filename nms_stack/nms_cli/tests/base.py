# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

# Import more test suites here; they must be a subclass of unittest.TestCase
from nms_cli.tests.test_k8s_cli import TestK8sNmsCli
from nms_cli.tests.test_swarm_cli import TestSwarmNmsCli


if __name__ == "__main__":
    unittest.main()
