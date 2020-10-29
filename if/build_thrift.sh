#!/bin/bash

# Fail script on any error.
set -e

# Build thrift files.
for THRIFT_FILE in "$@"; do
    echo "Building file: " $THRIFT_FILE
    /usr/local/facebook/bin/thrift1 --gen mstch_cpp2 -I ../.. "$THRIFT_FILE"
done
