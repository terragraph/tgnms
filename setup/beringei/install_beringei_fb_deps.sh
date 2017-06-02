#!/bin/bash
set -e

FB_VERSION="2017.04.24.00"
ZSTD_VERSION="1.1.1"

echo "This script configures CentOS 7 with everything needed to run beringei."
echo "It requires that you run it as root. sudo works great for that."

ready_destdir() {
        if [[ -e ${2} ]]; then
                echo "Moving aside existing $1 directory.."
                mv -v "$2" "$2.bak.$(date +%Y-%m-%d)"
        fi
}

mkdir -pv /usr/local/facebook-${FB_VERSION}
ln -sfT /usr/local/facebook-${FB_VERSION} /usr/local/facebook

export LDFLAGS="-L/usr/local/facebook/lib -Wl,-rpath=/usr/local/facebook/lib"
export CPPFLAGS="-I/usr/local/facebook/include"

cd /tmp

wget -O /tmp/folly-${FB_VERSION}.tar.gz https://github.com/facebook/folly/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/wangle-${FB_VERSION}.tar.gz https://github.com/facebook/wangle/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/fbthrift-${FB_VERSION}.tar.gz https://github.com/facebook/fbthrift/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/proxygen-${FB_VERSION}.tar.gz https://github.com/facebook/proxygen/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/mstch-master.tar.gz https://github.com/no1msd/mstch/archive/master.tar.gz
wget -O /tmp/zstd-${ZSTD_VERSION}.tar.gz https://github.com/facebook/zstd/archive/v${ZSTD_VERSION}.tar.gz

tar xzf folly-${FB_VERSION}.tar.gz
tar xzf wangle-${FB_VERSION}.tar.gz
tar xzf fbthrift-${FB_VERSION}.tar.gz
tar xzf proxygen-${FB_VERSION}.tar.gz
tar xzf mstch-master.tar.gz
tar xzf zstd-${ZSTD_VERSION}.tar.gz

pushd mstch-master
cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook-${FB_VERSION} .
make install
popd

pushd zstd-${ZSTD_VERSION}
make install PREFIX=/usr/local/facebook-${FB_VERSION}
popd


pushd folly-${FB_VERSION}/folly
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make install
popd

pushd wangle-${FB_VERSION}/wangle
cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook-${FB_VERSION} -DBUILD_SHARED_LIBS:BOOL=ON .
make
# Wangle tests are broken. Disabling ctest.
# ctest
make install
popd

pushd fbthrift-${FB_VERSION}/thrift
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make install
popd

pushd proxygen-${FB_VERSION}/proxygen
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make install
popd
