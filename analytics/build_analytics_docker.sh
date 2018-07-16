#!/bin/bash
set -e

echo "This script will copy the used the interface file from ../beringei/beringei/if to interface/beringei/if"

# Copy all thrift files from beringei/if
mkdir -p beringei/if
cp -r ../beringei/beringei/if .

docker build -t analytics -f Dockerfile .
