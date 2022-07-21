#!/bin/bash

LATEST_RELEASE=$(hg bookmarks --remote | grep releases/lts-nms | awk '{print $1}' | sort | tail -n 1 | sed 's/remote\///g')
echo "Patching release $LATEST_RELEASE"

hg pull
hg update remote/$LATEST_RELEASE
hg graft $1

hg push --to $LATEST_RELEASE
