#!/bin/bash
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

THIS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ACTUAL_VERSION=$(cat "$THIS_DIR/../bin/NODE_VERSION")
# Use "process.stdout.write" to avoid trailing new line.
EXPECTED_VERSION=$("$THIS_DIR/../bin/node" --eval \
                    'process.stdout.write(process.versions.node)')

echo "NODE_VERSION: $ACTUAL_VERSION"
echo "node -p 'process.versions.node': $EXPECTED_VERSION"

if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "NODE_VERSION mismatch." >&2
  exit 1
fi
