# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

add_library(
    beringei_query_service_test_util STATIC
    TestMain.cpp
)
add_dependencies(beringei_query_service_test_util gtest_tp)

add_executable(
    beringei_query_service_core_test_bin
    BeringeiReaderDataPointsTest.cpp
    BeringeiReaderUptimeTest.cpp
    BeringeiReaderLinkAvailableTest.cpp
    StatsTypeAheadTest.cpp
)
target_link_libraries(
    beringei_query_service_core_test_bin
    beringei_core
    query_lib
    query_service_test_util
    ${FOLLY_LIBRARIES}
    ${GTEST_HARNESS_LIBS}
    ${LIBGLOG_LIBRARY}
    ${GFLAGS_LIBRARIES}
)
add_test(
  NAME beringei_query_service_lib_tests
  COMMAND ${CMAKE_CURRENT_BINARY_DIR}/beringei_query_service_core_test_bin
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)
