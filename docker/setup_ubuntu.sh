#!/bin/bash
set -e

FB_VERSION="2017.07.10.00"
ZSTD_VERSION="1.4.1"
CMAKE_VERSION="3.14.4"
CURL_VERSION="7.64.1"
RDKAFKA_VERSION="1.1.0"
CPPKAFKA_VERSION="0.3.1"

apt update

apt install --yes \
    autoconf \
    autoconf-archive \
    automake \
    binutils-dev \
    bison \
    clang-format-3.9 \
    flex \
    g++ \
    git \
    gperf \
    libboost-all-dev \
    libcap-dev \
    libdouble-conversion-dev \
    libevent-dev \
    libgflags-dev \
    libgoogle-glog-dev \
    libjemalloc-dev \
    libkrb5-dev \
    liblz4-dev \
    liblzma-dev \
    libnuma-dev \
    libsasl2-dev \
    libsnappy-dev \
    libssl1.0-dev \
    libtool \
    make \
    pkg-config \
    scons \
    wget \
    zip \
    zlib1g-dev

ready_destdir() {
        if [[ -e ${2} ]]; then
                echo "Moving aside existing $1 directory.."
                mv -v "$2" "$2.bak.$(date +%Y-%m-%d)"
        fi
}

mkdir -pv /usr/local/facebook-${FB_VERSION}
ln -sfT /usr/local/facebook-${FB_VERSION} /usr/local/facebook

cd /tmp

wget -O /tmp/cmake-${CMAKE_VERSION}.tar.gz https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}.tar.gz
wget -O /tmp/librdkafka-${RDKAFKA_VERSION}.tar.gz https://github.com/edenhill/librdkafka/archive/v${RDKAFKA_VERSION}.tar.gz
wget -O /tmp/cppkafka-${CPPKAFKA_VERSION}.tar.gz https://github.com/mfontanini/cppkafka/archive/v${CPPKAFKA_VERSION}.tar.gz
wget -O /tmp/curl-${CURL_VERSION}.tar.gz https://curl.haxx.se/download/curl-${CURL_VERSION}.tar.gz
wget -O /tmp/mstch-master.tar.gz https://github.com/no1msd/mstch/archive/master.tar.gz
wget -O /tmp/zstd-${ZSTD_VERSION}.tar.gz https://github.com/facebook/zstd/archive/v${ZSTD_VERSION}.tar.gz
wget -O /tmp/folly-${FB_VERSION}.tar.gz https://github.com/facebook/folly/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/wangle-${FB_VERSION}.tar.gz https://github.com/facebook/wangle/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/fbthrift-${FB_VERSION}.tar.gz https://github.com/facebook/fbthrift/archive/v${FB_VERSION}.tar.gz
wget -O /tmp/proxygen-${FB_VERSION}.tar.gz https://github.com/facebook/proxygen/archive/v${FB_VERSION}.tar.gz

tar xzvf cmake-${CMAKE_VERSION}.tar.gz
tar xzvf librdkafka-${RDKAFKA_VERSION}.tar.gz
tar xzvf cppkafka-${CPPKAFKA_VERSION}.tar.gz
tar xzvf curl-${CURL_VERSION}.tar.gz
tar xzvf mstch-master.tar.gz
tar xzvf zstd-${ZSTD_VERSION}.tar.gz
tar xzvf folly-${FB_VERSION}.tar.gz
tar xzvf wangle-${FB_VERSION}.tar.gz
tar xzvf fbthrift-${FB_VERSION}.tar.gz
tar xzvf proxygen-${FB_VERSION}.tar.gz

PROC=`cat /proc/cpuinfo | grep processor | wc -l`

pushd cmake-${CMAKE_VERSION}
./configure --prefix=/usr
make -j ${PROC} install
popd

pushd librdkafka-${RDKAFKA_VERSION}
cmake -DBUILD_SHARED_LIBS:BOOL=ON .
make -j ${PROC} install
popd

pushd cppkafka-${CPPKAFKA_VERSION}
cmake -DBUILD_SHARED_LIBS:BOOL=ON .
make -j ${PROC} install
popd

export LDFLAGS="-L/usr/local/facebook/lib -Wl,-rpath=/usr/local/facebook/lib"
export CPPFLAGS="-I/usr/local/facebook/include"

pushd curl-${CURL_VERSION}
./configure
make -j ${PROC} install
popd

pushd mstch-master
cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook-${FB_VERSION} .
make -j ${PROC} install
popd

pushd zstd-${ZSTD_VERSION}
make -j ${PROC} install PREFIX=/usr/local/facebook-${FB_VERSION}
popd


pushd folly-${FB_VERSION}/folly
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make -j ${PROC} install
popd

pushd wangle-${FB_VERSION}/wangle
cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook-${FB_VERSION} -DBUILD_SHARED_LIBS:BOOL=ON .
make -j ${PROC}
# Wangle tests are broken. Disabling ctest.
# ctest
make install
popd

pushd fbthrift-${FB_VERSION}/thrift
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make -j ${PROC} install
popd

pushd proxygen-${FB_VERSION}/proxygen
autoreconf -ivf
./configure --prefix=/usr/local/facebook-${FB_VERSION}
make -j ${PROC} install
popd

# cleanup build
rm -rf /tmp/*
