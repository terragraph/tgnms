#!/bin/bash
yum install -y git vim libtool automake \
        openssl-devel libevent-devel \
        python-devel flex flex-devel bison bison-devel snappy \
        snappy-devel cyrus-sasl-devel gperf libcap-devel wget \
	unzip
# autoconf + archive
if [ ! -f "autoconf-2.69.tar.xz" ]; then
	wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.xz
	tar -xf autoconf-2.69.tar.xz
fi
pushd autoconf-2.69
./configure --prefix=/usr && make && make install
popd
if [ ! -f "autoconf-archive-2017.09.28.tar.xz" ]; then
  wget http://mirror.us-midwest-1.nexcess.net/gnu/autoconf-archive/autoconf-archive-2017.09.28.tar.xz
	tar -xf autoconf-archive-2017.09.28.tar.xz
fi
pushd autoconf-archive-2017.09.28
./configure --prefix=/usr && make && make install
popd
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

if [ ! -f "mysql-connector-c-6.1.10-src.tar.gz" ]; then
  wget https://dev.mysql.com/get/Downloads/Connector-C/mysql-connector-c-6.1.10-src.tar.gz
  tar -zxf mysql-connector-c-6.1.10-src.tar.gz
fi
pushd mysql-connector-c-6.1.10-src
cmake -G "Unix Makefiles" && make && make install
if [ -f "/usr/local/mysql/lib/libmysqlclient.so" ]; then
  ln -s /usr/local/mysql/lib/libmysqlclient.so /usr/local/mysql/lib/libmysqlclient_r.so
fi
if [ -f "/usr/local/mysql/lib/libmysqlclient.so.18" ]; then
  ln -s /usr/local/mysql/lib/libmysqlclient.so.18 /usr/local/mysql/lib/libmysqlclient_r.so.18
fi
popd

echo "/usr/local/mysql/lib" > /etc/ld.so.conf.d/usr_local_mysql.conf

ldconfig

git clone https://github.com/anhstudios/mysql-connector-cpp.git
pushd mysql-connector-cpp
cmake . && make && make install
popd
