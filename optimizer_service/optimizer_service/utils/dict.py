#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import collections
import copy
from typing import Dict


def deep_update(dst: Dict, src: Dict, join_sets: bool = False) -> None:
    """Perform an in-place deep merge of 'src' dict into 'dst' dict."""
    for k, v in src.items():
        if k in dst:
            if isinstance(v, dict) and isinstance(dst[k], collections.abc.Mapping):
                deep_update(dst[k], v, join_sets)
            elif join_sets and isinstance(v, set) and isinstance(dst[k], set):
                dst[k].update(v)
            else:
                dst[k] = copy.deepcopy(v)
        else:
            dst[k] = copy.deepcopy(v)
