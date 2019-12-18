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

find_library(MYSQL_CLIENT_LIB NAMES "mysqlclient"
  PATHS "/usr/local/mysql/lib"
  NO_DEFAULT_PATH
)
find_library(CURL curl)
find_library(SNAPPY snappy)

set(QUERY_SRCS
    AggregatorService.cpp
    AggregatorService.h
    ApiServiceClient.cpp
    ApiServiceClient.h
    CurlUtil.cpp
    CurlUtil.h
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
    QueryServiceFactory.cpp
    QueryServiceFactory.h
    ScanRespService.cpp
    ScanRespService.h
    StatsUtils.cpp
    StatsUtils.h
    TopologyFetcher.cpp
    TopologyFetcher.h
    TopologyStore.cpp
    TopologyStore.h
    WirelessController.cpp
    WirelessController.h
    consts/PrometheusConsts.cpp
    consts/PrometheusConsts.h
)

set(QUERY_HANDLER_SRCS
    handlers/LogsWriteHandler.cpp
    handlers/LogsWriteHandler.h
    handlers/NotFoundHandler.cpp
    handlers/NotFoundHandler.h
    handlers/TestConnectionHandler.cpp
    handlers/TestConnectionHandler.h
    handlers/WirelessControllerStatsHandler.cpp
    handlers/WirelessControllerStatsHandler.h
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
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PROXYGEN_LIBRARIES}
    Threads::Threads
    ${MYSQL_CLIENT_LIB}
    ${RDKAFKA_LIBRARIES}
    ${CPPKAFKA_LIBRARIES}
    mysqlcppconn
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
    ${PROXYGEN_LIBRARIES}
    ${RDKAFKA_LIBRARIES}
    ${CPPKAFKA_LIBRARIES}
    Threads::Threads
    ${SNAPPY}
)

# Prevent overriding the parent project's compiler/linker
# settings on Windows
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

add_subdirectory(tests)
