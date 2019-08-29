# Pull base image
FROM ubuntu:18.04

ARG THRIFT_VERSION="0.11.0"
ARG THRIFT_DEPS="automake bison flex g++ libboost-all-dev libevent-dev libssl-dev libtool make pkg-config wget"

RUN apt-get update
RUN apt-get -y upgrade

# Install prerequisites
RUN apt-get install -y $THRIFT_DEPS vim

# Install python3.7
RUN apt-get install -y python3.7 python3-pip python3.7-dev \
    && cd /usr/local/bin \
    && ln -s /usr/bin/python3.7 python \
    && python -m pip install --upgrade pip setuptools

# Install Apache Thrift
RUN cd /tmp \
    && wget http://archive.apache.org/dist/thrift/${THRIFT_VERSION}/thrift-${THRIFT_VERSION}.tar.gz \
    && tar xzvf thrift-${THRIFT_VERSION}.tar.gz \
    && cd thrift-${THRIFT_VERSION} \
    && ./bootstrap.sh \
    && ./configure \
    && make -j $(nproc --all) \
    && make install \
    && pip install ./lib/py

# Install tglib
WORKDIR /usr/local/tglib
COPY ./tglib .
COPY ./if ./tgif
RUN python setup.py build_thrift && pip install .

# Remove Apache Thrift dependencies and source code
RUN apt-get purge -y --auto-remove $THRIFT_DEPS python3.7-dev \
    && apt-get clean \
    && rm -rf /tmp/*

# Define default command
CMD ["bash"]
