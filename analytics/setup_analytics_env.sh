#!/bin/bash
set -e

echo "This script configures ubuntu with everything needed to run NMS analytics."
echo "It requires that you run it as root. sudo works great for that."

APACHE_THRIFT_VERSION="0.11.0"
# Python package versions
DJANGO_VERSION="2.1.1"
JUPYTER_VERSION="1.0.0"
MATPLOTLIB_VERSION="2.2.2"
NUMPY_VERSION="1.14.5"
PYMYSQL_VERSION="0.9.2"
REQUESTS_VERSION="2.19.1"

# Install Python3 packages
pip install django==$DJANGO_VERSION
pip install jupyter==$JUPYTER_VERSION
pip install matplotlib==$MATPLOTLIB_VERSION
pip install numpy==$NUMPY_VERSION
pip install PyMySQL==$PYMYSQL_VERSION
pip install requests==$REQUESTS_VERSION

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
python3 setup.py install
popd
popd
