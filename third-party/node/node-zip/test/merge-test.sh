#!/bin/bash
# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

set -euo pipefail

THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -dt zipstorage-create-test.XXXXX)"

zip_merge () {
  "$THIS_DIR/../../bin/node" "$NODE_ZIP/merge.js" "$@"
}

cleanup () {
  rm -r "$TEST_DIR"
}

source "$THIS_DIR/testutil.sh"

trap cleanup exit

B_PREFIX=b-prefix
C_PREFIX=c/goes/here

setup_once () {
  mkdir -p \
    "$TEST_DIR/src" \
    "$TEST_DIR/expected" \
    "$TEST_DIR/actual" \
    "$TEST_DIR/expected-prefixed" \
    "$TEST_DIR/actual-prefixed" \
    "$TEST_DIR/expected-single-prefixed" \
    "$TEST_DIR/actual-single-prefixed" \
    "$TEST_DIR/actual-no-prefix"

  cd "$TEST_DIR/src"
  write a a/a/a.txt a/b.txt a/c.txt
  write b b/a/b.txt b/b.txt
  write c c/a/a.txt c/d.txt
  write d d/a

  cd "$TEST_DIR"
  rsync -cr src/a/* expected/
  rsync -cr src/b/* expected/
  rsync -cr src/c/* expected/

  mkdir -p "expected-prefixed/$B_PREFIX" "expected-prefixed/$C_PREFIX"
  rsync -cr src/a/* expected-prefixed/
  rsync -cr src/b/* "expected-prefixed/$B_PREFIX/"
  rsync -cr src/c/* "expected-prefixed/$C_PREFIX/"

  mkdir -p "expected-single-prefixed/$B_PREFIX"
  rsync -cr src/b/* "expected-single-prefixed/$B_PREFIX/"

  zip_create --base src/a a.zip src/a
  zip_create --base src/b b.zip src/b
  zip_create --base src/c c.zip src/c
}

test_simple_merge () {
  zip_merge merged.zip a.zip b.zip c.zip
  unzip merged.zip -d actual
  assert_equal expected actual
}

test_merging_single_archive () {
  zip_merge single-no-prefix.zip b.zip
  unzip single-no-prefix.zip -d actual-no-prefix
  assert_equal src/b actual-no-prefix
}

test_merging_with_prefixes () {
  zip_merge merged-with-prefix.zip --prefix "$B_PREFIX" b.zip a.zip --prefix "$C_PREFIX" c.zip
  unzip merged-with-prefix.zip -d actual-prefixed
  assert_equal expected-prefixed actual-prefixed
}

test_merging_single_archive_with_prefix () {
  zip_merge single-with-prefix.zip --prefix "$B_PREFIX" b.zip
  unzip single-with-prefix.zip -d actual-single-prefixed
  assert_equal expected-single-prefixed actual-single-prefixed
}

test_merging_symlinks () {
  set -x
  mkdir -p "$TEST_DIR/symlinks" "$TEST_DIR/symlinks-actual"
  pushd "$TEST_DIR/symlinks"
  write A a/a
  write B b/b
  ln -s a a/la
  ln -s b b/lb
  popd
  zip_create --base "$TEST_DIR/symlinks" symlinks-a.zip "$TEST_DIR/symlinks/a"
  zip_create --base "$TEST_DIR/symlinks" symlinks-b.zip "$TEST_DIR/symlinks/b"
  zip_merge symlinks.zip symlinks-a.zip symlinks-b.zip
  unzip symlinks.zip -d "$TEST_DIR/symlinks-actual"
  assert_equal "$TEST_DIR/symlinks" "$TEST_DIR/symlinks-actual"
}

setup_once
test_simple_merge
test_merging_single_archive
test_merging_with_prefixes
test_merging_single_archive_with_prefix
test_merging_symlinks
