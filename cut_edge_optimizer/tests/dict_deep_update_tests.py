#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

import unittest

from cut_edge_optimizer.utils.dict import deep_update


class DictDeepUpdateTests(unittest.TestCase):
    def test_empty_dst(self) -> None:
        src = {"foo": "bar"}
        dst = {}

        deep_update(dst, src)
        self.assertDictEqual(dst, src)

    def test_nested_dict(self) -> None:
        src = {"foo": {"bar": "baz"}}
        dst = {"foo": {"bar": "qux"}}

        deep_update(dst, src)
        self.assertDictEqual(dst, src)

        src = {"foo": {"bar": "baz"}}
        dst = {"foo": {"bar": "qux", "quux": "quuz"}}

        deep_update(dst, src)
        self.assertDictEqual(dst, {"foo": {"bar": "baz", "quux": "quuz"}})

    def test_concat_sets(self) -> None:
        src = {"foo": {"bar": {"baz"}}}
        dst = {"foo": {"bar": {"qux"}}}

        deep_update(dst, src)
        self.assertDictEqual(dst, src)

        src = {"foo": {"bar": {"baz"}}}
        dst = {"foo": {"bar": {"qux"}}}
        deep_update(dst, src, join_sets=True)
        self.assertDictEqual(dst, {"foo": {"bar": {"qux", "baz"}}})
