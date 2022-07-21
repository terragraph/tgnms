# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

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
    Threads::Threads
)
