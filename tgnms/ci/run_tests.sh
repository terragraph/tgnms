#!/bin/bash

set -xe

IMAGE_NAME=nms-test
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
PARENT_DIR="$(dirname "$SCRIPTPATH")"


docker build -t $IMAGE_NAME "$PARENT_DIR"

# Yarn can't work in alpine
# see https://github.com/facebook/flow/issues/3649
# docker run -t -i --rm $IMAGE_NAME yarn run flow

docker run -t -i --rm $IMAGE_NAME yarn run test
docker run -t -i --rm $IMAGE_NAME yarn run eslint ./

