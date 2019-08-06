# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

cmake_minimum_required(VERSION 3.9)

set (CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -fno-omit-frame-pointer -fsanitize=address")
set (CMAKE_LINKER_FLAGS_DEBUG "${CMAKE_STATIC_LINKER_FLAGS_DEBUG} -fno-omit-frame-pointer -fsanitize=address")

# This is necessary so that find_package can find the "Find$x.cmake" files.
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/.cmake" ${CMAKE_MODULE_PATH})
include_directories(${CMAKE_CURRENT_BINARY_DIR})

find_package(Folly REQUIRED)
find_package(FBThrift REQUIRED)
find_package(GFlags REQUIRED)
find_package(Glog REQUIRED)
find_package(Threads REQUIRED)
find_package(Wangle REQUIRED)
find_package(Proxygen REQUIRED)
find_package(RdKafka REQUIRED)
find_package(CppKafka REQUIRED)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})
include_directories(${FOLLY_INCLUDE_DIR} ${FBTHRIFT_INCLUDE_DIR} ${PROXYGEN_INCLUDE_DIR} ${WANGLE_INCLUDE_DIR})

set(CMAKE_CXX_STANDARD 14)

add_definitions("-D_GLIBCXX_USE_CXX11_ABI=1")

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

add_subdirectory(if)
add_subdirectory(ping_service)
add_subdirectory(query_service)
