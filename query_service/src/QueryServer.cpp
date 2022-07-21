/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <unistd.h>

#include "KafkaStatsService.h"
#include "NetworkHealthService.h"
#include "HttpService.h"
#include "TopologyFetcher.h"

#include <curl/curl.h>
#include <folly/Memory.h>
#include <folly/Synchronized.h>
#include <folly/system/ThreadName.h>
#include <folly/init/Init.h>
#include <gflags/gflags.h>
#include <pistache/endpoint.h>
#include <pistache/http.h>
#include <pistache/router.h>

using namespace facebook::terragraph::stats;

DEFINE_int32(http_port, 443, "Port to listen on with HTTP protocol");
DEFINE_string(ip, "::", "IP/Hostname to bind to");
DEFINE_int32(
    threads,
    0,
    "Number of threads to listen on. Numbers <= 0 "
    "will use the number of cores on this machine.");
DEFINE_string(kafka_broker_endpoint_list, "", "Kafka broker endpoint list");
// regular frequency node stats
DEFINE_bool(enable_kafka_stats, false, "Enable Kafka stats service");
DEFINE_string(
    kafka_stats_topic,
    "stats",
    "Topic name for regular frequency stats");
DEFINE_int32(kafka_consumer_threads, 5, "Kafka consumer reader threads");
// high frequency node stats
DEFINE_bool(enable_kafka_hf_stats, false, "Enable Kafka HF stats service");
DEFINE_string(
    kafka_hf_stats_topic,
    "hf_stats",
    "Topic name for high frequency stats");
DEFINE_int32(kafka_hf_consumer_threads, 1, "Kafka HF consumer reader threads");

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);
  google::InstallFailureSignalHandler();

  LOG(INFO) << "Attemping to bind to port " << FLAGS_http_port;

  if (FLAGS_threads <= 0) {
    FLAGS_threads = sysconf(_SC_NPROCESSORS_ONLN);
    CHECK_GT(FLAGS_threads, 0);
  }

  // initialize curl thread un-safe operations
  curl_global_init(CURL_GLOBAL_ALL);

  Pistache::Port port(static_cast<uint16_t>(FLAGS_http_port));
  Pistache::Address addr(Pistache::Ipv4::any(), port);
  HttpService httpService(addr, FLAGS_threads);
  httpService.initRoutes();
  LOG(INFO) << "Starting HTTP Service on port "
            << FLAGS_http_port;
  std::thread httpThread([&httpService]() {
    folly::setThreadName("HTTP Server");
    httpService.run();
  });

  LOG(INFO) << "Starting Topology Update Service";
  auto topologyFetch = std::make_shared<TopologyFetcher>();

  LOG(INFO) << "Starting Network Health Service";
  auto healthService =
      std::make_shared<NetworkHealthService>(FLAGS_kafka_broker_endpoint_list);

  std::vector<std::unique_ptr<KafkaStatsService>> kafkaStatsServiceList;
  if (FLAGS_enable_kafka_stats) {
    LOG(INFO) << "Starting Kafka Stats Service";
    for (int threadCountIdx = 0; threadCountIdx < FLAGS_kafka_consumer_threads;
         threadCountIdx++) {
      const std::string threadName = std::to_string(threadCountIdx);
      KafkaStatsService* kafkaStatsService = new KafkaStatsService(
          FLAGS_kafka_broker_endpoint_list,
          FLAGS_kafka_stats_topic,
          30 /* interval in seconds */,
          threadName);
      kafkaStatsServiceList.emplace_back(std::move(kafkaStatsService));
    }
  } else {
    LOG(INFO) << "Kafka Stats Service Disabled";
  }
  if (FLAGS_enable_kafka_hf_stats) {
    LOG(INFO) << "Starting HF Kafka Stats Service";
    for (int threadCountIdx = 0;
         threadCountIdx < FLAGS_kafka_hf_consumer_threads;
         threadCountIdx++) {
      const std::string threadName = "HF-" + std::to_string(threadCountIdx);
      KafkaStatsService* kafkaStatsService = new KafkaStatsService(
          FLAGS_kafka_broker_endpoint_list,
          FLAGS_kafka_hf_stats_topic,
          1 /* interval in seconds */,
          threadName);
      kafkaStatsServiceList.emplace_back(std::move(kafkaStatsService));
    }
  } else {
    LOG(INFO) << "Kafka HF Stats Service Disabled";
  }

  httpThread.join();
  // clean-up curl memory
  curl_global_cleanup();
  return 0;
}
