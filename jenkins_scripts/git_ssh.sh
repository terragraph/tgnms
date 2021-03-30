#!/bin/sh
# Copyright (c) 2014-present, Facebook, Inc.
# Workaround: GIT_SSH_COMMAND isn't supported by Git < 2.3
exec ${GIT_SSH_COMMAND:-ssh} "$@"
