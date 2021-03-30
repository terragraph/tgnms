# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

set(CMAKE_CXX_FLAGS "-g")

# set ASAN=1 to to build with ASAN enabled
if("$ENV{ASAN}" STREQUAL "1")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address -DASAN=ON")
endif()

find_library(MYSQL_CLIENT_LIB mysqlclient)
find_library(CURL curl)
find_library(SNAPPY snappy)
find_library(LIBZ z)

set(QUERY_SRCS
    ApiServiceClient.cpp
    ApiServiceClient.h
    CurlUtil.cpp
    CurlUtil.h
    HttpService.cpp
    HttpService.h
    KafkaStatsService.cpp
    KafkaStatsService.h
    MetricCache.cpp
    MetricCache.h
    MySqlClient.cpp
    MySqlClient.h
    NetworkHealthService.cpp
    NetworkHealthService.h
    NetworkHealthUtils.cpp
    NetworkHealthUtils.h
    PrometheusUtils.cpp
    PrometheusUtils.h
    StatsUtils.cpp
    StatsUtils.h
    TopologyFetcher.cpp
    TopologyFetcher.h
    TopologyStore.cpp
    TopologyStore.h
    consts/PrometheusConsts.cpp
    consts/PrometheusConsts.h
)

set(QUERY_HANDLER_SRCS
    handlers/LinkHealthHandler.cpp
    handlers/LinkHealthHandler.h
    handlers/NotFoundHandler.cpp
    handlers/NotFoundHandler.h
    handlers/TestConnectionHandler.cpp
    handlers/TestConnectionHandler.h
)

set(QUERY_SERVICE_SRCS
  QueryServer.cpp
)

add_library(query_lib STATIC ${QUERY_SRCS})
add_library(query_handlers_lib STATIC ${QUERY_HANDLER_SRCS})
target_link_libraries(
    query_lib
    query_handlers_lib
    nms_thrift
    ${CURL}
    ${LIBZ}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PISTACHE_LIBRARY}
    Threads::Threads
    ${MYSQL_CLIENT_LIB}
    ${RDKAFKA_LIBRARIES}
    ${CPPKAFKA_LIBRARIES}
    ${FBTHRIFT_LIBRARIES}
    mysqlcppconn
    -ldl
)

add_executable(query_service ${QUERY_SERVICE_SRCS})

target_link_libraries(
    query_service
    query_lib
    query_handlers_lib
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PISTACHE_LIBRARY}
    ${RDKAFKA_LIBRARIES}
    ${CPPKAFKA_LIBRARIES}
    Threads::Threads
    ${SNAPPY}
    ${LIBZ}
    -ldl
    -levent
)

# Prevent overriding the parent project's compiler/linker
# settings on Windows
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

add_subdirectory(tests)
