#!/bin/bash
set -e

echo "This script will copy the used the interface file from ../beringei/beringei/if to ./if"

# Copy all thrift files from beringei/if
cp -r ../beringei/beringei/if .

docker build -t analytics -f Dockerfile .
