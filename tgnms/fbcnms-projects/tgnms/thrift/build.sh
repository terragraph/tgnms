#!/bin/bash
# Copyright (c) 2014-present, Facebook, Inc.

required_version="0.12.0"
curr_version=$(thrift -version 2>&1)
if [ $? != 0 ]; then
    echo "Not using the correct thrift version (apache thrift $required_version), bailing"
    exit 1
fi
if [ "$(printf '%s\n' "$requiredver" "$currentver" | sort -V | head -n1)" = "$required_version" ]; then
    echo "Not using the correct thrift version (apache thrift $required_version), bailing"
    exit 1
fi


find ./ -name '*.thrift' -exec thrift -r -out gen-nodejs --gen js:node {} \;
echo "Successfully regenerated thrift files"
