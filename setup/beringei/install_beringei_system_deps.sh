#!/bin/bash
yum install -y git vim libtool automake gflags-devel glog-devel \
        openssl-devel double-conversion-devel libevent-devel \
        python-devel flex flex-devel bison bison-devel snappy \
        snappy-devel cyrus-sasl-devel gperf libcap-devel wget \
	unzip
# python for boost python libs
if [ ! -f "Python-2.7.13.tgz" ]; then
	wget https://www.python.org/ftp/python/2.7.13/Python-2.7.13.tgz
	tar -xf Python-2.7.13.tgz
fi
pushd Python-2.7.13
./configure --enable-shared &&  make && make altinstall
popd
# autoconf + archive
if [ ! -f "autoconf-2.69.tar.xz" ]; then
	wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.xz
	tar -xf autoconf-2.69.tar.xz
fi
pushd autoconf-2.69
./configure && make && make install
popd
if [ ! -f "autoconf-archive-2017.03.21.tar.xz" ]; then
	wget http://mirror.easthsia.com/gnu/autoconf-archive/autoconf-archive-2017.03.21.tar.xz
	tar -xf autoconf-archive-2017.03.21.tar.xz
fi
pushd autoconf-archive-2017.03.21
./configure && make && make install
# more recent version of boost
if [ ! -f "boost_1_64_0.tar.gz" ]; then
	wget "https://dl.bintray.com/boostorg/release/1.64.0/source/boost_1_64_0.tar.gz"
	tar -zxf boost_1_64_0.tar.gz
fi
pushd boost_1_64_0
./bootstrap.sh && ./b2 && ./b2 install
popd
# newer version of cmake needed
if [ ! -f "cmake-3.8.1.tar.gz" ]; then
	wget https://cmake.org/files/v3.8/cmake-3.8.1.tar.gz
	tar -xf cmake-3.8.1.tar.gz
fi
# finish cmake
pushd cmake-3.8.1
./configure --prefix=/usr && make && make install
popd
git clone https://github.com/gflags/gflags.git
pushd gflags
cmake -DBUILD_SHARED_LIBS=yes . && make && make install
popd
git clone https://github.com/google/glog.git
pushd glog
cmake -DBUILD_SHARED_LIBS=yes . && make && make install
popd
git clone https://github.com/google/double-conversion.git
pushd double-conversion
cmake -DBUILD_SHARED_LIBS=yes . && make && make install
popd
