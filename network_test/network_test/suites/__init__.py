#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

__all__ = ["BaseTest", "LinkTest", "NodeTest"]

from typing import Any, Dict, List

from .base import BaseTest
from .link import LinkTest
from .node import NodeTest
from .parallel import ParallelTest
from .sequential import SequentialTest
from ..models import NetworkTestDirection, NetworkTestType


class ParallelLinkTest(LinkTest, ParallelTest):
    def __init__(
        self,
        network_name: str,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        test_type = NetworkTestType.PARALLEL_LINK
        super().__init__(network_name, test_type, direction, iperf_options, allowlist)


class ParallelNodeTest(NodeTest, ParallelTest):
    def __init__(
        self,
        network_name: str,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        test_type = NetworkTestType.PARALLEL_NODE
        super().__init__(network_name, test_type, direction, iperf_options, allowlist)


class SequentialLinkTest(LinkTest, SequentialTest):
    def __init__(
        self,
        network_name: str,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        test_type = NetworkTestType.SEQUENTIAL_LINK
        super().__init__(network_name, test_type, direction, iperf_options, allowlist)


class SequentialNodeTest(NodeTest, SequentialTest):
    def __init__(
        self,
        network_name: str,
        direction: NetworkTestDirection,
        iperf_options: Dict[str, Any],
        allowlist: List[str],
    ) -> None:
        test_type = NetworkTestType.SEQUENTIAL_NODE
        super().__init__(network_name, test_type, direction, iperf_options, allowlist)
