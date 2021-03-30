#!/bin/bash
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -dt zip-merge-test.XXXXX)"
FIXTURE_SRC="$THIS_DIR/fixture"
FIXTURE_CP="$TEST_DIR/fixture"
TEST_ZIP="$TEST_DIR/test.zip"
NODE="$THIS_DIR/../../bin/node"

cleanup () {
  rm -r "$TEST_DIR"
}

trap cleanup exit

source "$THIS_DIR/testutil.sh"

cp -r "$FIXTURE_SRC" "$FIXTURE_CP"

# buck does not like checked-in symlinks
ln -s test.txt "$FIXTURE_CP/test.txt.symlink"
mkdir -p "$FIXTURE_CP/node_modules"
ln -s ../tests  "$FIXTURE_CP/node_modules/tests"

zip_create --base "$FIXTURE_CP" "$TEST_ZIP" "$FIXTURE_CP"

set -x
test "$("$NODE" "$NODE_ZIP/run.js" "$TEST_ZIP/index.js")" == "OK"
