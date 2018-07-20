#!/bin/bash
set -e

echo "This script will copy the used the interface file from ../beringei/beringei/if to ./interface"

# Copy all thrift files from beringei/if
mkdir -p interface/beringei/if
cp -r ../beringei/beringei/if/ ./interface/beringei/

docker build -t analytics -f Dockerfile .
