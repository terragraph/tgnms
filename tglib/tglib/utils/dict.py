#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import collections
import copy
from typing import Dict


def deep_update(dst: Dict, src: Dict, join_lists: bool = False) -> None:
    """Perform an in-place deep merge of ``src`` into ``dst``.

    Args:
        dst: The destination dictionary.
        src: The source dictionary.
        join_lists: Flag to join lists instead of overwriting them.

    Example:
        >>> src = {'foo': {'bar': 'baz'}}
        >>> dst = {'foo': {'bar': 'qux', 'quux': 'quuz'}}
        >>> deep_update(dst, src)
        >>> dst
        {'foo': {'bar': 'baz', 'quux': 'quuz'}}
        >>> src = {"foo": {"bar": ["baz"]}}
        >>> dst = {"foo": {"bar": ["qux"]}}
        >>> deep_update(dst, src, join_lists=True)
        >>> dst
        {"foo": {"bar": ["qux", "baz"]}}
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
