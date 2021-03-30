#!/usr/bin/env bash

# Usage: ~/fbsource/xplat/js/third-party/yarn/scripts/garbage-collector.sh
#
# Run this script to automatically remove all tarballs in the offline folder
# that can be detected as not being used anywhere.

set -e

ROOT_DIR=$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && hg root)

cd "$ROOT_DIR"

# Find all yarn.lock files in the source directory.
YARNLOCKS=$(hg files -I '**/yarn.lock')

# Extract the hashes from the yarn.lock's and remove duplicates.
RESOLVED_HASHES=$(
  echo "$YARNLOCKS" |
  xargs cat |
  perl -ne 'print if s@^[ \t]+resolved.+[#/]([a-f0-9]{40})"?$@\1@g' |
  sort |
  uniq
)

# Find the offline-mirror files and their hashes. Filtering entries whose hash
# or path that matches a yarn.lock hash.
OFFLINE_MIRROR_GARBAGE=$(
  hg files xplat/third-party/yarn/offline-mirror |
  xargs shasum |
  grep -v -F -f <(echo "$RESOLVED_HASHES") |
  cut -d ' ' -f3
)

if [[ -z "$OFFLINE_MIRROR_GARBAGE" ]]; then
  echo "No garbage found."
else
  echo "$OFFLINE_MIRROR_GARBAGE" | xargs du -h | sort -h
  echo ============================================================
  printf "Files to delete: %s (%s)\n" \
	 "$(echo "$OFFLINE_MIRROR_GARBAGE" | wc -l)" \
	 "$(echo "$OFFLINE_MIRROR_GARBAGE" | xargs du -ch | tail -n1 | tr '\t' ' ')"
  echo "yarn.lock's checked: $(echo "$YARNLOCKS" | wc -l)"

  while true; do
    # shellcheck disable=SC2162
    read -n 1 -p "Remove these files? [Y/n] " yn
      case $yn in
        [Yy]*|"")
          echo
          echo "Removing..."
          echo "$OFFLINE_MIRROR_GARBAGE" | xargs -P1 hg rm
          break;;
        [Nn]*)
          exit;;
      esac
  done
fi

printf '\x40generated\n%s\n' > xplat/third-party/yarn/.offline_mirror_manifest.txt \
       "$(cd xplat/third-party/yarn/offline-mirror && hg files -- . | xargs shasum)"
