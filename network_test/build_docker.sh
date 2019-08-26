#!/bin/bash
set -e

echo "This script will build the network_test image"
echo "Assume it is run from the network_test directory"

cd ..

docker build -t network-test -f network_test/Dockerfile .
