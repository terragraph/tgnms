/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <unistd.h>

#include "AggregatorService.h"
#include "KafkaStatsService.h"
#include "NetworkHealthService.h"
#include "QueryServiceFactory.h"
#include "ScanRespService.h"
#include "TopologyFetcher.h"

#include <curl/curl.h>
#include <folly/Memory.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <gflags/gflags.h>
#include <proxygen/httpserver/HTTPServer.h>
#include <proxygen/httpserver/RequestHandlerFactory.h>

using namespace facebook::gorilla;
using namespace proxygen;

using folly::EventBase;
using folly::SocketAddress;

using Protocol = HTTPServer::Protocol;
DEFINE_int32(http_port, 443, "Port to listen on with HTTP protocol");
DEFINE_string(ip, "::", "IP/Hostname to bind to");
DEFINE_int32(
    threads,
    0,
    "Number of threads to listen on. Numbers <= 0 "
    "will use the number of cores on this machine.");
DEFINE_bool(enable_scans, true, "Enable the scan response service");
DEFINE_bool(enable_kafka_stats, false, "Enable Kafka stats service");
DEFINE_string(
    kafka_stats_topic,
    "stats",
    "Topic name for regular frequency stats");
DEFINE_int32(kafka_consumer_threads, 5, "Kafka consumer reader threads");
DEFINE_string(kafka_broker_endpoint_list, "", "Kafka broker endpoint list");

int main(int argc, char* argv[]) {
  folly::init(&argc, &argv, true);
  google::InstallFailureSignalHandler();

  LOG(INFO) << "Attemping to bind to port " << FLAGS_http_port;

  std::vector<HTTPServer::IPConfig> IPs = {
      {SocketAddress(FLAGS_ip, FLAGS_http_port, true), Protocol::HTTP},
  };

  if (FLAGS_threads <= 0) {
    FLAGS_threads = sysconf(_SC_NPROCESSORS_ONLN);
    CHECK_GT(FLAGS_threads, 0);
  }

  // initialize curl thread un-safe operations
  curl_global_init(CURL_GLOBAL_ALL);

  HTTPServerOptions options;
  options.threads = static_cast<size_t>(FLAGS_threads);
  options.idleTimeout = std::chrono::milliseconds(60000);
  options.shutdownOn = {SIGINT, SIGTERM};
  options.enableContentCompression = false;
  options.handlerFactories =
      RequestHandlerChain().addThen<QueryServiceFactory>().build();

  LOG(INFO) << "Starting Query Service server on port "
            << FLAGS_http_port;
  auto server = std::make_shared<HTTPServer>(std::move(options));
  server->bind(IPs);
  std::thread httpThread([server]() {
    folly::setThreadName("HTTP Server");
    server->start();
  });

  LOG(INFO) << "Starting Topology Update Service";
  auto topologyFetch = std::make_shared<TopologyFetcher>();

  LOG(INFO) << "Starting Aggregator Service";
  auto topologyAggregator = std::make_shared<AggregatorService>();

  LOG(INFO) << "Starting Network Health Service";
  auto healthService =
      std::make_shared<NetworkHealthService>(FLAGS_kafka_broker_endpoint_list);

  std::shared_ptr<ScanRespService> scanRespService;
  if (FLAGS_enable_scans) {
    LOG(INFO) << "Starting Scan Response Service";
    scanRespService.reset(new ScanRespService());
  } else {
    LOG(INFO) << "Scan Response Service Disabled";
  }

  std::vector<std::unique_ptr<KafkaStatsService>> kafkaStatsServiceList;
  if (FLAGS_enable_kafka_stats) {
    LOG(INFO) << "Starting Kafka Stats Service";
    for (int threadCountIdx = 0; threadCountIdx < FLAGS_kafka_consumer_threads;
         threadCountIdx++) {
      // TODO - support HF stats
      KafkaStatsService* kafkaStatsService = new KafkaStatsService(
          FLAGS_kafka_broker_endpoint_list,
          FLAGS_kafka_stats_topic,
          30 /* interval in seconds */,
          threadCountIdx);
      kafkaStatsServiceList.emplace_back(std::move(kafkaStatsService));
    }
  } else {
    LOG(INFO) << "Kafka Stats Service Disabled";
  }

  httpThread.join();
  // clean-up curl memory
  curl_global_cleanup();
  return 0;
}
