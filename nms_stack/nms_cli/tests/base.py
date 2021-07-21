import unittest

# Import more test suites here; they must be a subclass of unittest.TestCase
from nms_cli.tests.test_k8s_cli import TestK8sNmsCli
from nms_cli.tests.test_swarm_cli import TestSwarmNmsCli


if __name__ == "__main__":
    unittest.main()
