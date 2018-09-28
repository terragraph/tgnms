# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

set(CMAKE_CXX_FLAGS "-g")

find_library(MYSQL_CLIENT_LIB NAMES "mysqlclient"
  PATHS "/usr/local/mysql/lib"
  NO_DEFAULT_PATH
)
find_library(CURL curl)

set(BERINGEI_QUERY_SRCS
    AggregatorService.cpp
    AggregatorService.h
    ApiServiceClient.cpp
    ApiServiceClient.h
    BeringeiClientStore.cpp
    BeringeiClientStore.h
    BeringeiReader.cpp
    BeringeiReader.h
    MySqlClient.cpp
    MySqlClient.h
    QueryServiceFactory.cpp
    QueryServiceFactory.h
    RawReadBeringeiData.cpp
    RawReadBeringeiData.h
    RuckusController.cpp
    RuckusController.h
    ScanRespService.cpp
    ScanRespService.h
    StatsTypeAheadCache.cpp
    StatsTypeAheadCache.h
    TopologyFetcher.cpp
    TopologyFetcher.h
    TopologyStore.cpp
    TopologyStore.h
)

set(BERINGEI_QUERY_HANDLER_SRCS
    handlers/EventsQueryHandler.cpp
    handlers/EventsQueryHandler.h
    handlers/EventsWriteHandler.cpp
    handlers/EventsWriteHandler.h
    handlers/UnifiedStatsWriteHandler.cpp
    handlers/UnifiedStatsWriteHandler.h
    handlers/LogsWriteHandler.cpp
    handlers/LogsWriteHandler.h
    handlers/NotFoundHandler.cpp
    handlers/NotFoundHandler.h
    handlers/RuckusControllerStatsHandler.cpp
    handlers/RuckusControllerStatsHandler.h
    handlers/StatsHandler.cpp
    handlers/StatsHandler.h
    handlers/StatsTypeAheadHandler.cpp
    handlers/StatsTypeAheadHandler.h
    handlers/StatsWriteHandler.cpp
    handlers/StatsWriteHandler.h
    handlers/UnifiedStatsWriteHandler.cpp
    handlers/UnifiedStatsWriteHandler.h
    handlers/RawReadHandler.cpp
    handlers/RawReadHandler.h
)

set(BERINGEI_QUERY_SERVICE_SRCS
  BeringeiQueryServer.cpp
)

add_library(beringei_query_lib STATIC ${BERINGEI_QUERY_SRCS})
add_library(beringei_query_handlers_lib STATIC ${BERINGEI_QUERY_HANDLER_SRCS})
target_link_libraries(
    beringei_query_lib
    beringei_query_handlers_lib
    beringei_client
    beringei_plugin
    ${CURL}
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PROXYGEN_LIBRARIES}
    Threads::Threads
    ${MYSQL_CLIENT_LIB}
    mysqlcppconn
)

add_executable(beringei_query_service ${BERINGEI_QUERY_SERVICE_SRCS})

target_link_libraries(
    beringei_query_service
    beringei_query_lib
    beringei_query_handlers_lib
    beringei_query_lib
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PROXYGEN_LIBRARIES}
    Threads::Threads
)

add_subdirectory(tests)
