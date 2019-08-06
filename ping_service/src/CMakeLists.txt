# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

# set ASAN=1 to build with ASAN enabled
if("$ENV{ASAN}" STREQUAL "1")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address -DASAN=ON")
endif()


set(UDP_PING_CLIENT_SRCS
    UdpPingClient.cpp
    AsyncUdpSocket.cpp
    AsyncUdpSocket.h
    Probe.h
    UdpPinger.cpp
    UdpPinger.h
)

add_executable(udp_ping_client ${UDP_PING_CLIENT_SRCS})
target_link_libraries(
    udp_ping_client
    query_lib
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    ${PROXYGEN_LIBRARIES}
    ${RDKAFKA_LIBRARIES}
    ${CPPKAFKA_LIBRARIES}
    Threads::Threads
)
