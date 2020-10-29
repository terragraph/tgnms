# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

configure_file(CMakeLists.txt.in googletest-download/CMakeLists.txt)
execute_process(COMMAND ${CMAKE_COMMAND} -G "${CMAKE_GENERATOR}" .
  RESULT_VARIABLE result
  WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/googletest-download )
if(result)
  message(FATAL_ERROR "CMake step for googletest failed: ${result}")
endif()
execute_process(COMMAND ${CMAKE_COMMAND} --build .
  RESULT_VARIABLE result
  WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/googletest-download )
if(result)
  message(FATAL_ERROR "Build step for googletest failed: ${result}")
endif()

add_subdirectory(${CMAKE_CURRENT_BINARY_DIR}/googletest-src
                 ${CMAKE_CURRENT_BINARY_DIR}/googletest-build
                 EXCLUDE_FROM_ALL)

# according to the docs this shouldn't be needed
# https://github.com/google/googletest/tree/master/googletest
include_directories("${gtest_SOURCE_DIR}/include")

add_library(
    query_service_test_util STATIC
    TestMain.cpp
)

add_executable(
    health_datapoints_test
    NetworkHealthDataPointsTest.cpp
)

target_link_libraries(
    health_datapoints_test
    query_lib
    query_service_test_util
    gtest_main
    ${FOLLY_LIBRARIES}
    ${GTEST_HARNESS_LIBS}
    ${LIBGLOG_LIBRARY}
    ${GFLAGS_LIBRARIES}
)

add_test(
  NAME health_datapoints_test
  COMMAND ${CMAKE_CURRENT_BINARY_DIR}/health_datapoints_test
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

add_executable(
    prometheus_metrics_test
    PrometheusMetricsTest.cpp
)

target_link_libraries(
    prometheus_metrics_test
    query_lib
    query_service_test_util
    gtest_main
    ${FOLLY_LIBRARIES}
    ${GTEST_HARNESS_LIBS}
    ${LIBGLOG_LIBRARY}
    ${GFLAGS_LIBRARIES}
)

add_test(
  NAME prometheus_metrics_test
  COMMAND ${CMAKE_CURRENT_BINARY_DIR}/prometheus_metrics_test
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)
