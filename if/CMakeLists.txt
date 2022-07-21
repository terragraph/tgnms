# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# Needed for relative imports amongst headers below.
include_directories(gen-cpp2)

# Uplevel the path to this so lower things can use it.
set(THRIFT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/gen-cpp2 PARENT)

set(
    THRIFT_FILES
    Event.thrift
    QueryService.thrift
    Aggregator.thrift
    BWAllocation.thrift
    Controller.thrift
    IpPrefix.thrift
    Lsdb.thrift
    Pinger.thrift
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
    nms_thrift STATIC
    ${THRIFT_GEN}
)

target_link_libraries(
    nms_thrift
    ${FBTHRIFT_LIBRARIES}
)
