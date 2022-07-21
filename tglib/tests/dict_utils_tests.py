#!/usr/bin/env python3

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

import unittest

from tglib.utils.dict import deep_update


class DictUtilsTests(unittest.TestCase):
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

    def test_join_lists(self) -> None:
        src = {"foo": {"bar": ["baz"]}}
        dst = {"foo": {"bar": ["qux"]}}

        deep_update(dst, src)
        self.assertDictEqual(dst, src)

        src = {"foo": {"bar": ["baz"]}}
        dst = {"foo": {"bar": ["qux"]}}
        deep_update(dst, src, join_lists=True)
        self.assertDictEqual(dst, {"foo": {"bar": ["qux", "baz"]}})
