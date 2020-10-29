# Pull base image
FROM alpine:edge AS thrift

ARG FB_VERSION=v2020.05.04.00
ARG FMT_VERSION=6.1.2
ARG ZSTD_VERSION=v1.4.4

# Add testing repo for double-conversion-dev and glog-dev packages
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

# Install dependencies, build thrift, and remove build dependencies
RUN apk update && apk add --no-cache --virtual build-deps \
                      binutils-gold \
                      bison \
                      boost-dev \
                      build-base \
                      cmake \
                      double-conversion-dev \
                      flex \
                      git \
                      gflags-dev \
                      glog-dev \
                      libevent-dev \
                      libsodium-dev \
                      openssl-dev \
                      zlib-dev && \
    # Install fmt
    cd /opt && \
    git clone -b $FMT_VERSION https://github.com/fmtlib/fmt.git && \
    cd fmt && \
    mkdir _build && \
    cd _build && \
    cmake .. -DFMT_DOC=OFF -DFMT_TEST=OFF && \
    make -j $(nproc) install && \
    # Install folly
    cd /opt && \
    git clone -b $FB_VERSION https://github.com/facebook/folly.git && \
    cd folly && \
    mkdir _build && \
    cd _build && \
    cmake .. && \
    make -j $(nproc) install && \
    # Install fizz
    cd /opt && \
    git clone -b $FB_VERSION https://github.com/facebookincubator/fizz.git && \
    cd fizz && \
    mkdir _build && \
    cd _build && \
    cmake ../fizz -DBUILD_TESTS=OFF && \
    make -j $(nproc) install && \
    # Install wangle
    cd /opt && \
    git clone -b $FB_VERSION https://github.com/facebook/wangle.git && \
    cd wangle/wangle && \
    mkdir _build && \
    cd _build && \
    cmake .. -DBUILD_TESTS=OFF && \
    make -j $(nproc) install && \
    # Install zstd
    cd /opt && \
    git clone -b $ZSTD_VERSION https://github.com/facebook/zstd.git && \
    cd zstd/build/cmake && \
    mkdir _build && \
    cd _build && \
    cmake .. && \
    make -j $(nproc) install && \
    # Install rsocket and yarpl
    cd /opt && \
    git clone -b $FB_VERSION https://github.com/rsocket/rsocket-cpp.git && \
    cd rsocket-cpp && \
    mkdir _build && \
    cd _build && \
    cmake .. -DBUILD_BENCHMARKS=OFF -DBUILD_TESTS=OFF -DBUILD_EXAMPLES=OFF && \
    make -j $(nproc) install && \
    make -j $(nproc) install yarpl && \
    # Install fbthrift
    cd /opt && \
    git clone -b $FB_VERSION https://github.com/facebook/fbthrift && \
    cd fbthrift/build && \
    cmake .. && \
    make -j $(nproc) install && \
    # Remove build dependencies
    apk del build-deps

# Pull base image
FROM alpine:edge AS builder

COPY --from=thrift /opt/fbthrift/thrift/lib/py /usr/local/thrift
COPY --from=thrift /usr/local/bin/thrift1 /usr/local/bin/thrift

# Install thrift python library
RUN apk update && apk add --no-cache python3 py3-pip py3-setuptools && \
    ln -s python3 /usr/bin/python && \
    pip install /usr/local/thrift && \
    rm -rf /usr/local/thrift

# Copy tglib source and raw thrift files
WORKDIR /usr/local/tglib
COPY tglib/ .flake8 ./
COPY if/*.thrift ./if/

# Compile thrift files
RUN apk add --no-cache boost-filesystem libstdc++ && \
    python setup.py build_thrift --out-path=/usr/lib/python3.8/site-packages

# Install tglib
RUN apk add --no-cache --virtual build-deps \
        gcc \
        libffi-dev \
        make \
        musl-dev \
        openssl-dev \
        python3-dev && \
    pip install .[docs] && \
    apk del build-deps

# Pull base image
FROM alpine:edge

# Install python3
RUN apk update && apk add --no-cache python3 && \
    ln -s python3 /usr/bin/python

# Copy python dependencies
COPY --from=builder /usr/bin/pip /usr/bin/pip
COPY --from=builder /usr/lib/python3.8/site-packages /usr/lib/python3.8/site-packages
