# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

# Needed for relative imports amongst headers below.
include_directories(gen-cpp2)

# Uplevel the path to this so lower things can use it.
set(BERINGEI_THRIFT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/gen-cpp2 PARENT)

set(
    THRIFT_FILES
    Event.thrift
    beringei_data.thrift
    beringei_grafana.thrift
    beringei_query.thrift
    beringei.thrift
    Aggregator.thrift
    BWAllocation.thrift
    Controller.thrift
    IpPrefix.thrift
    Lsdb.thrift
    Pinger.thrift
    scans.thrift
    Stats.thrift
    Topology.thrift
)

# Generate thrift
execute_process(
  COMMAND bash "build_thrift.sh" ${THRIFT_FILES}
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
)

# Include all the gen-cpp2/ files
file(GLOB_RECURSE THRIFT_GEN
    ${CMAKE_CURRENT_SOURCE_DIR}/gen-cpp2/*.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/gen-cpp2/*.h
    ${CMAKE_CURRENT_SOURCE_DIR}/gen-cpp2/*.tcc)


set_source_files_properties(
    ${THRIFT_GEN}
    PROPERTIES GENERATED TRUE
)

add_library(
    beringei_thrift STATIC
    ${THRIFT_GEN}
)

target_link_libraries(
    beringei_thrift
    ${FBTHRIFT_LIBRARIES}
)
