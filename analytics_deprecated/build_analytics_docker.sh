#!/bin/bash
set -e

echo "This script will copy thrift files in ./if to analytics/if"

# Copy all thrift files from beringei/if
mkdir -p if
cp -a ../if/ .

docker build -t analytics -f Dockerfile .
