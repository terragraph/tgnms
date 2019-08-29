#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import collections
import copy
from typing import Dict


def deep_update(dst: Dict, src: Dict, join_lists: bool = False) -> None:
    """Perform an in-place deep merge of 'src' dict into 'dst' dict.

    >>> src = {'foo': {'bar': 'baz'}}
    >>> dst = {'foo': {'bar': 'qux', 'quux': 'quuz'}}
    >>> deep_update(dst, src)

    >>> dst
    {'foo': {'bar': 'baz', 'quux': 'quuz'}}
    """
    for k, v in src.items():
        if k in dst:
            if isinstance(v, dict) and isinstance(dst[k], collections.abc.Mapping):
                deep_update(dst[k], v, join_lists)
            elif join_lists and isinstance(v, list) and isinstance(dst[k], list):
                dst[k] = dst[k] + v
            else:
                dst[k] = copy.deepcopy(v)
        else:
            dst[k] = copy.deepcopy(v)
