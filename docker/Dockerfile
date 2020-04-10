# pull base image.for build
FROM alpine:latest AS builder

# fixed versions where possible
ARG CPPKAFKA_VERSION=0.3.1
ARG FB_VERSION=2020.03.23.00
ARG FMT_VERSION=6.1.2
ARG LIBSODIUM_VERSION=1.0.18
ARG RDKAFKA_VERSION=1.1.0
ARG ZSTD_VERSION=1.4.1

ENV WORKDIR /usr/local/nms

# copy build files for query + ping services
COPY docker $WORKDIR/docker/
COPY CMakeLists.txt $WORKDIR/CMakeLists.txt
COPY .cmake $WORKDIR/.cmake/
COPY if $WORKDIR/if/
COPY ping_service $WORKDIR/ping_service/
COPY query_service $WORKDIR/query_service/

RUN apk update
RUN apk add bash g++ make libstdc++ bsd-compat-headers cmake boost-dev curl-dev autoconf automake libtool libevent-dev gmock gtest-dev binutils-gold bison flex gperf lz4-dev xz-dev mariadb-connector-c-dev snappy-dev git
# some packages aren't in mainline
RUN apk add double-conversion-dev glog-dev --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/

WORKDIR /tmp

RUN wget -O /tmp/mysql-connector-cpp.tar.gz https://github.com/anhstudios/mysql-connector-cpp/archive/master.tar.gz && \
    tar xf /tmp/mysql-connector-cpp.tar.gz && \
    cd /tmp/mysql-connector-cpp-master && \
    cmake . && \
    make -j $(nproc) install

RUN wget -O /tmp/librdkafka.tar.gz https://github.com/edenhill/librdkafka/archive/v${RDKAFKA_VERSION}.tar.gz && \
    tar xf /tmp/librdkafka.tar.gz && \
    cd /tmp/librdkafka-${RDKAFKA_VERSION} && \
    cmake -DBUILD_SHARED_LIBS=OFF . && \
    make -j $(nproc) install

RUN wget -O /tmp/cppkafka.tar.gz https://github.com/mfontanini/cppkafka/archive/v${CPPKAFKA_VERSION}.tar.gz && \
    tar xf /tmp/cppkafka.tar.gz && \
    cd /tmp/cppkafka-${CPPKAFKA_VERSION} && \
    cmake -DBUILD_SHARED_LIBS=OFF . && \
    make -j $(nproc) install

RUN wget -O /tmp/mstch.tar.gz https://github.com/no1msd/mstch/archive/master.tar.gz && \
    tar xf /tmp/mstch.tar.gz && \
    cd /tmp/mstch-master && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook . && \
    make -j $(nproc) install

RUN wget -O /tmp/zstd.tar.gz https://github.com/facebook/zstd/archive/v${ZSTD_VERSION}.tar.gz && \
    tar xf /tmp/zstd.tar.gz && \
    cd /tmp/zstd-${ZSTD_VERSION}/build/cmake && \
    cmake DBUILD_SHARED_LIBS=OFF -DZSTD_BUILD_SHARED=OFF . && \
    make -j $(nproc) install

RUN wget -O /tmp/fmt.tar.gz https://github.com/fmtlib/fmt/archive/${FMT_VERSION}.tar.gz && \
    tar xf /tmp/fmt.tar.gz && \
    cd /tmp/fmt-${FMT_VERSION} && \
    cmake -DBUILD_SHARED_LIBS=OFF . && \
    make -j $(nproc) install

RUN wget -O /tmp/libsodium.tar.gz https://github.com/jedisct1/libsodium/archive/${LIBSODIUM_VERSION}.tar.gz && \
    tar xf /tmp/libsodium.tar.gz && \
    cd /tmp/libsodium-${LIBSODIUM_VERSION} && \
    autoreconf -ivf && \
    ./configure && \
    make -j $(nproc) install

RUN wget -O /tmp/folly.tar.gz https://github.com/facebook/folly/archive/v${FB_VERSION}.tar.gz && \
    tar xf /tmp/folly.tar.gz && \
    cd /tmp/folly-${FB_VERSION} && \
    cmake -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook -DBUILD_SHARED_LIBS=OFF . && \
    make -j $(nproc) install

RUN wget -O /tmp/fizz.tar.gz https://github.com/facebookincubator/fizz/archive/v${FB_VERSION}.tar.gz && \
    tar xf /tmp/fizz.tar.gz && \
    cd /tmp/fizz-${FB_VERSION}/fizz && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook . && \
    make -j $(nproc) install

RUN wget -O /tmp/wangle.tar.gz https://github.com/facebook/wangle/archive/v${FB_VERSION}.tar.gz && \
    tar xf /tmp/wangle.tar.gz && \
    cd /tmp/wangle-${FB_VERSION}/wangle && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook . && \
    make -j $(nproc) install

# rsocket does not have a working release to pin to
RUN wget -O /tmp/rsocket-cpp-master.tar.gz https://github.com/rsocket/rsocket-cpp/archive/master.tar.gz && \
    tar xf /tmp/rsocket-cpp-master.tar.gz && \
    cd /tmp/rsocket-cpp-master/build && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_PREFIX_PATH=/usr/local/facebook/lib/cmake .. && \
    make -j $(nproc) install

RUN wget -O /tmp/fbthrift.tar.gz https://github.com/facebook/fbthrift/archive/v${FB_VERSION}.tar.gz && \
    tar xf /tmp/fbthrift.tar.gz && \
    cd /tmp/fbthrift-${FB_VERSION} && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook -DCMAKE_PREFIX_PATH=/usr/local/facebook/lib/cmake . && \
    make -j $(nproc) install

RUN wget -O /tmp/proxygen.tar.gz https://github.com/facebook/proxygen/archive/v${FB_VERSION}.tar.gz && \
    tar xf /tmp/proxygen.tar.gz && \
    cd /tmp/proxygen-${FB_VERSION} && \
    cmake -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX:PATH=/usr/local/facebook -DCMAKE_PREFIX_PATH=/usr/local/facebook/lib/cmake . && \
    make -j $(nproc) install

WORKDIR /usr/local/nms/build

# build and strip symbols
RUN cmake .. && \
    make -j $(nproc) && \
    strip bin/query_service && \
    strip bin/udp_ping_client && \
    strip bin/health_datapoints_test

RUN rm -rf /tmp/*

FROM alpine:latest

# some packages aren't in mainline
RUN apk add --no-cache double-conversion glog --repository http://dl-3.alpinelinux.org/alpine/edge/testing/
RUN apk add --no-cache boost-context gflags libcrypto1.1 libcurl libevent libgcc libssl1.1 libstdc++ lz4-libs mariadb-connector-c musl nghttp2-libs snappy xz-libs zlib mysql-client

# copy the libraries we just built
COPY --from=builder /usr/local/lib64/librdkafka.so.1 /usr/local/lib64/
COPY --from=builder /usr/local/lib/libsodium.so.23 /usr/local/lib/
COPY --from=builder /usr/local/lib/libcppkafka.so.0.3.1 /usr/local/lib/
COPY --from=builder /usr/local/lib/libmysqlcppconn.so.6 /usr/local/lib/

# copy the stripped binary
WORKDIR /usr/local/nms/build/bin
COPY --from=builder /usr/local/nms/build/bin/query_service .
COPY --from=builder /usr/local/nms/build/bin/udp_ping_client .
COPY --from=builder /usr/local/nms/build/bin/health_datapoints_test .

# use same workdir as old image so 'bin/query_service' stays functional
WORKDIR /usr/local/nms/build
