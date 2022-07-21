#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import os
import re
import sys

from dataclasses import dataclass
from typing import AnyStr, Dict, List, Optional, Tuple


@dataclass
class CrashDetails:
    """Class for storing information about a single crash/error instance"""

    crash_type: str  # error code/keyword
    crash_time: str
    node_id: str
    application: str  # vpp, e2e_minion, stats_agent, open/r etc..
    affected_function: Optional[str]
    affected_lines: List[str]

    def __str__(self):
        return (
            f"[Crash type]: {self.crash_type}\n"
            + f"[Crash time]: {self.crash_time}\n"
            + f"[Node ID]: {self.node_id}\n"
            + f"[Application type:] {self.application}\n"
            + f"[Affected function name]: {self.affected_function}\n"
            + f"[Affected lines]:\n"
            + "".join(self.affected_lines)
            + "\n"
        )
