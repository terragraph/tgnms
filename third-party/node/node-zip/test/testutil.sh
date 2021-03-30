# (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

# shellcheck shell=bash

write () {
  local contents="$1"
  for file in "${@:2}"; do
    mkdir -p "$(dirname "$file")"
    echo "$contents" > "$file"
  done
}

zip_create () {
  "$THIS_DIR/../../bin/node" "$NODE_ZIP/create.js" "$@"
}

assert_equal () {
  # diff on macos does not support --no-dereference, so we need another way
  # to make sure symlinks are not regarded equivalent to regular files.
  # We use find to get directory subtrees, and make `ls` suffix directories
  # with '/' and links with '@', and strip the leading directory from
  # the output. We compare the outputs with `diff`, and finally sort everything
  # to get a consistent output to compare.
  diff -u \
    <(find "$1" -exec ls -1dF '{}' \; | awk "{print substr(\$0, 1 + ${#1})}" | sort) \
    <(find "$2" -exec ls -1dF '{}' \; | awk "{print substr(\$0, 1 + ${#2})}" | sort) \
    >&2

  # After making sure that all entries have the same type, we compare contents
  # with `diff -ru`
  diff -ru "$1" "$2" >&2

  # All this would be much easier with `diff -ru --no-dereference`
}
