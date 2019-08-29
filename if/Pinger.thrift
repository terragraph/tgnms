/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

namespace cpp2 facebook.gorilla.thrift
namespace py terragraph_thrift.Pinger

struct Target {
  1: string ip;
  2: string mac;
  3: string name;
  4: string site;
  5: string network;
  6: bool is_pop;
  7: bool is_cn;
}

struct Config {
  1: i32 pinger_cooldown_time;
  2: i32 pinger_rate;
  3: i32 target_port;
  4: i32 num_sender_threads;
  5: i32 num_receiver_threads;
  6: i32 base_src_port;
  7: i32 src_port_count;
  8: i32 socket_buffer_size;
}

struct Metadata {
  1: Target dst;
  2: i32 tos;
  3: bool dead;
}

struct Metrics {
  1: i32 num_recv;
  2: i32 num_xmit;
  3: double rtt_avg;
  4: double rtt_p75;
  5: double rtt_p90;
  6: double loss_ratio;
  7: double rtt_max;
}

struct TestResult {
  1: double timestamp_s;
  2: Metadata metadata;
  3: Metrics metrics;
}
