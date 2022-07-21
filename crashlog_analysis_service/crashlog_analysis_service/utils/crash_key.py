#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import os
import re
import sys

from .crash_details import CrashDetails
from typing import AnyStr, Dict, List, Optional, Tuple


class CrashKey:
    """Class for storing relevant fields to group crashes by.
    If a field is None, it is not a relevant field.
    """

    crash_type: Optional[str]  # error code/keyword
    crash_time: Optional[str]
    node_id: Optional[str]
    application: Optional[str]  # vpp, e2e_minion, stats_agent, open/r etc.

    def __init__(
        self,
        crash_type: Optional[str] = None,
        crash_time: Optional[str] = None,
        node_id: Optional[str] = None,
        application: Optional[str] = None,
    ):
        self.crash_type = crash_type
        self.crash_time = crash_time
        self.node_id = node_id
        self.application = application

    def __eq__(self, other):
        return (
            self.crash_type == other.crash_type
            and self.crash_time == other.crash_time
            and self.node_id == other.node_id
            and self.application == other.application
        )

    def __hash__(self) -> int:
        return hash((self.crash_type, self.crash_time, self.node_id, self.application))

    def __str__(self) -> str:
        str_rep: str = "[ -- "
        if self.crash_type is not None:
            str_rep += f"Crash type: {self.crash_type} -- "
        if self.crash_time is not None:
            str_rep += f"Crash time: {self.crash_time} -- "
        if self.node_id is not None:
            str_rep += f"Node ID: {self.node_id} -- "
        if self.application is not None:
            str_rep += f"Application: {self.application} -- "
        str_rep += "]"
        return str_rep

    def create_key_from_base(self, crash_details: CrashDetails):
        """Interpret this(self) key as a base key and create a new key
        from the given crash details, populating only the fields that
        are not None in the base key.
        """
        new_key = CrashKey()
        if self.crash_type is not None:
            new_key.crash_type = crash_details.crash_type
        if self.crash_time is not None:
            new_key.crash_time = crash_details.crash_time
        if self.node_id is not None:
            new_key.node_id = crash_details.node_id
        if self.application is not None:
            new_key.application = crash_details.application
        return new_key
