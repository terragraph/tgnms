#!/usr/bin/env python3
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

import dotslash


dotslash.export_fbsource_universal_bundle(
    target="//xplat/third-party/yarn:yarn_for_dotslash",
    executables={"linux": "yarn_bash", "macos": "yarn_bash", "windows": "yarn_batch"},
    oncall="jsinfra",
    generated_dotslash_file="xplat/third-party/yarn/yarn_dotslash",
)
