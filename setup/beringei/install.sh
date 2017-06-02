#!/bin/bash
yum install -y git vim libtool automake gflags-devel glog-devel \
        openssl-devel double-conversion-devel libevent-devel \
        python-devel flex flex-devel bison bison-devel snappy \
        snappy-devel cyrus-sasl-devel gperf libcap-devel wget
# python for boost python libs
wget https://www.python.org/ftp/python/2.7.13/Python-2.7.13.tgz
pushd Python-2.7.13
./configure && make && make altinstall
popd
# autoconf + archive
wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.xz
tar -xf autoconf-2.69.tar.xz
pushd autoconf-2.69
./configure && make && make install
popd
wget http://mirror.easthsia.com/gnu/autoconf-archive/autoconf-archive-2017.03.21.tar.xz
tar -xf autoconf-archive-2017.03.21.tar.xz
pushd autoconf-archive-2017.03.21
./configure && make && make install
# more recent version of boost
wget "https://dl.bintray.com/boostorg/release/1.64.0/source/:boost_1_64_0.tar.gz"
tar -zxf boost_1_64_0.tar.gz
pushd boost_1_64_0
./bootstrap.sh && ./b2 && ./b2 install
popd
# newer version of cmake needed
wget https://cmake.org/files/v3.8/cmake-3.8.1.tar.gz
# finish cmake
pushd cmake-3.8.1
./configure --prefix=/usr && make && make install
popd
# install fb dependencies from beringei
./setup_centos7.sh
#git clone https://github.com/facebookincubator/beringei.git
#pushd beringei
#./setup_ubuntu.sh
