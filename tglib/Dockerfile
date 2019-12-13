# Pull base image
FROM alpine:edge

# Add testing repo for double-conversion-dev and glog-dev packages
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    echo "@py http://dl-cdn.alpinelinux.org/alpine/v3.10/main" >> /etc/apk/repositories

# Install dependencies, build fbthrift, and clean up
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
    git clone https://github.com/fmtlib/fmt.git && \
    cd fmt && \
    mkdir _build && \
    cd _build && \
    cmake .. -DFMT_DOC=OFF -DFMT_TEST=OFF && \
    make -j $(nproc) && \
    make install && \
    # Install folly
    cd /opt && \
    git clone https://github.com/facebook/folly.git && \
    cd folly && \
    mkdir _build && \
    cd _build && \
    cmake .. && \
    make -j $(nproc) && \
    make install && \
    # Install fizz
    cd /opt && \
    git clone https://github.com/facebookincubator/fizz && \
    cd fizz && \
    mkdir _build && \
    cd _build && \
    cmake ../fizz -DBUILD_TESTS=OFF && \
    make -j $(nproc) && \
    make install && \
    # Install wangle
    cd /opt && \
    git clone https://github.com/facebook/wangle.git && \
    cd wangle/wangle && \
    mkdir _build && \
    cd _build && \
    cmake .. -DBUILD_TESTS=OFF && \
    make -j $(nproc) && \
    make install && \
    # Install zstd
    cd /opt && \
    git clone https://github.com/facebook/zstd.git && \
    cd zstd/build/cmake && \
    mkdir _build && \
    cd _build && \
    cmake .. && \
    make -j $(nproc) && \
    make install && \
    # Install rsocket and yarpl
    cd /opt && \
    git clone https://github.com/rsocket/rsocket-cpp.git && \
    cd rsocket-cpp && \
    mkdir _build && \
    cd _build && \
    cmake .. -DBUILD_BENCHMARKS=OFF -DBUILD_TESTS=OFF -DBUILD_EXAMPLES=OFF && \
    make -j $(nproc) && \
    make install && \
    make install yarpl && \
    # Install fbthrift
    cd /opt && \
    git clone https://github.com/facebook/fbthrift && \
    cd fbthrift/build && \
    cmake .. && \
    make -j $(nproc) && \
    make install && \
    ln -s thrift1 /usr/local/bin/thrift && \
    # Remove dependencies and strip all symbols from external libraries
    strip -s /usr/local/lib/*.a && \
    apk del build-deps && \
    # Install python3 and build fbthrift python library
    apk add --no-cache python3@py python3-dev@py py3-six@py && \
    ln -s python3 /usr/bin/python && \
    python -m pip install --upgrade pip setuptools wheel && \
    pip install ../thrift/lib/py && \
    # Clean up
    rm -rf /opt/*

# Copy tglib source and raw thrift files
WORKDIR /usr/local/tglib
COPY tglib/ .flake8 ./
COPY if/ ./if

# Install dependencies, compile raw thrift files, build tglib, run ptr, and remove dependencies
RUN apk add --no-cache --virtual build-deps gcc libffi-dev musl-dev openssl-dev && \
    apk add --no-cache boost-filesystem libstdc++ && \
    python setup.py build_thrift && pip install .[ci,docs] && \
    ptr --system-site-packages && \
    apk del build-deps

# Set default command
CMD ["/bin/sh"]
