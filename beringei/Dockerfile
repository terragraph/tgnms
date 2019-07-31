# Pull base image.
FROM ubuntu:18.04

ENV WORKDIR /usr/local/beringei

RUN apt-get update
RUN apt-get -y upgrade
# Copy files from CircleCI into docker container.
COPY . $WORKDIR

# Define default command.
CMD ["bash"]

# Setup the docker container.
WORKDIR $WORKDIR
RUN $WORKDIR/setup_ubuntu.sh

RUN apt-get install -y libmysqlclient20 libmysqlclient-dev libmysql++3v5 libmysqlcppconn7v5 libmysqlcppconn-dev libboost-all-dev libcap-dev libdouble-conversion-dev libevent-dev libgflags2.2 libgoogle-glog-dev libjemalloc-dev libkrb5-dev liblz4-dev liblzma-dev libnuma-dev libsasl2-dev libsnappy-dev zlib1g-dev netcat vim mysql-client
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata

RUN mkdir -p /usr/local/mysql/lib
RUN ln -s /usr/lib/libmysqlpp.so* /usr/local/mysql/lib
RUN ln -s /usr/lib/x86_64-linux-gnu/libmysqlclient.* /usr/local/mysql/lib/

# Create a build directory.
RUN mkdir $WORKDIR/build
WORKDIR $WORKDIR/build

# Compile and install
RUN cmake ..
RUN /bin/bash -c 'make install -j$(cat /proc/cpuinfo | grep processor | wc -l)'

# Delete cmake files
# TODO - just copy binaries/libs we need instead of selectively deleting
RUN /bin/bash -c 'find . -name 'CMakeFiles' -type d|xargs rm -rf'
