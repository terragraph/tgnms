#!/bin/sh

# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

docker ps -a | awk '{print $NF}' | tail -n +2 | xargs docker rm -f
docker image ls -a | awk '{print $1}' | tail -n +2 | xargs docker image rm -f
docker volume ls | awk '{print $2}' | tail -n +2 | xargs docker volume rm
rm -rf terragraph
