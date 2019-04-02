# Copyright (c) 2016-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

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
    beringei_query_lib
    ${FBTHRIFT_LIBRARIES}
    ${FOLLY_LIBRARIES}
    ${GFLAGS_LIBRARIES}
    ${LIBGLOG_LIBRARIES}
    Threads::Threads
)
