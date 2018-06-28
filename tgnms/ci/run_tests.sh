#!/bin/bash

set -xe

IMAGE_NAME=nms-test
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
PARENT_DIR="$(dirname "$SCRIPTPATH")"

docker build -t $IMAGE_NAME "$PARENT_DIR"
docker run -t -i --rm $IMAGE_NAME npm test
docker run -t -i --rm $IMAGE_NAME npm run-script eslint ./

