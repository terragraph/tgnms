#!/bin/bash
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -dt zipstorage-create-test.XXXXX)"
SRC_DIR="$TEST_DIR/src"
OUT_DIR="$TEST_DIR/out"
ZIP_FILE="$TEST_DIR/archive.zip"

source "$THIS_DIR/testutil.sh"

cleanup () {
  rm -r "$TEST_DIR"
}

trap cleanup exit

setup_once () {
  mkdir -p "$SRC_DIR"
  pushd "$SRC_DIR"
  write a a/a/a.txt a/b.txt a/c.txt a/d/d.txt
  write b b/b.txt
  write c c/d.txt
  mkdir d; ln -s ../b d/b
  popd
}

setup () {
  test -e "$ZIP_FILE" && rm "$ZIP_FILE"
  test -d "$OUT_DIR" && rm -rf "$OUT_DIR"
  mkdir -p "$OUT_DIR"
}

archives_single_file () {
  setup
  zip_create --base "$SRC_DIR" "$ZIP_FILE" "$SRC_DIR/c/d.txt"
  unzip "$ZIP_FILE" -d "$OUT_DIR"
  assert_equal "$SRC_DIR/c/d.txt" "$OUT_DIR/c/d.txt"
}

archives_multiple_files () {
  setup
  zip_create --base "$SRC_DIR" \
    "$ZIP_FILE" \
    "$SRC_DIR/b/b.txt" \
    "$SRC_DIR/c/d.txt"
  unzip "$ZIP_FILE" -d "$OUT_DIR"
  assert_equal "$SRC_DIR/b/b.txt" "$OUT_DIR/b/b.txt"
  assert_equal "$SRC_DIR/c/d.txt" "$OUT_DIR/c/d.txt"
}

archives_symlink () {
  setup
  zip_create --base "$SRC_DIR" "$ZIP_FILE" \
    "$SRC_DIR/d/b" \
    "$SRC_DIR/b/b.txt"
  unzip "$ZIP_FILE" -d "$OUT_DIR"
  assert_equal "$SRC_DIR/b" "$OUT_DIR/b"
  assert_equal "$SRC_DIR/d" "$OUT_DIR/d"
}

archives_directory () {
  setup
  zip_create --base "$SRC_DIR/b" "$ZIP_FILE" "$SRC_DIR/b"
  unzip "$ZIP_FILE" -d "$OUT_DIR"
  assert_equal "$SRC_DIR/b" "$OUT_DIR"
}

archives_tree () {
  setup
  zip_create --base "$SRC_DIR" "$ZIP_FILE" "$SRC_DIR"
  unzip "$ZIP_FILE" -d "$OUT_DIR"
  assert_equal "$SRC_DIR" "$OUT_DIR"
}

fails_for_non_existent_files () {
  setup
  if zip_create "$ZIP_FILE" does-not-exist; then
    echo "archiving non-existent files should fail"
    exit 2
  fi
}

setup_once
archives_single_file
archives_multiple_files
archives_symlink
archives_directory
archives_tree
fails_for_non_existent_files
