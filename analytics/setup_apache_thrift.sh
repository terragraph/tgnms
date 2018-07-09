#!/bin/bash
set -e

APACHE_THRIFT_VERSION="0.11.0"

cd /tmp
wget -O /tmp/apache-thrift-${APACHE_THRIFT_VERSION}.tar.gz https://github.com/apache/thrift/archive/${APACHE_THRIFT_VERSION}.tar.gz
tar xzvf apache-thrift-${APACHE_THRIFT_VERSION}.tar.gz

pushd thrift-${APACHE_THRIFT_VERSION}
# install apache thrift
./bootstrap.sh
./configure
make
make install
# install apache thrift python3 lib
pushd lib/py
python3 setup.py
popd
popd
