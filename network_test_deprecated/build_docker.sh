#!/bin/bash
set -e

echo "This script will build the network_test image"
echo "Assume it is run from the nms directory"
echo "usage (e.g.):"
echo "'./network_test/build_docker.sh secure.cxl-terragraph.com:443/analytics:latest'"

docker build -t $1 -f network_test/Dockerfile .
