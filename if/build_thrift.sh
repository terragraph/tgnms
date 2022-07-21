#!/bin/bash

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Fail script on any error.
set -e

# Build thrift files.
for THRIFT_FILE in "$@"; do
    echo "Building file: " $THRIFT_FILE
    /usr/local/facebook/bin/thrift1 --gen mstch_cpp2 -I ../.. "$THRIFT_FILE"
done
