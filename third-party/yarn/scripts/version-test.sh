#!/bin/bash

THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ACTUAL_VERSION=$(cat "$THIS_DIR/../YARN_VERSION")
EXPECTED_VERSION=$($THIS_DIR/../yarn --version)

echo "YARN_VERSION: $ACTUAL_VERSION"
echo "yarn --version: $EXPECTED_VERSION"

if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "YARN_VERSION mismatch." >&2
  exit 1
fi
