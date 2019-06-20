#!/bin/bash
set -e

echo "This script configures ubuntu with everything needed to run NMS analytics."
echo "It requires that you run it as root. sudo works great for that."

APACHE_THRIFT_VERSION="0.11.0"

# Install Apache Thrift
cd /tmp
wget -O /tmp/apache-thrift-${APACHE_THRIFT_VERSION}.tar.gz https://github.com/apache/thrift/archive/${APACHE_THRIFT_VERSION}.tar.gz
tar xzvf apache-thrift-${APACHE_THRIFT_VERSION}.tar.gz
pushd thrift-${APACHE_THRIFT_VERSION}
./bootstrap.sh
./configure
make -j $(nproc --all)
make install
# Install Apache Thrift python3 lib
pushd lib/py
python setup.py install
popd
popd
