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
#include "QueryServiceFactory.h"
#include "StatsTypeAheadCache.h"
#include "TopologyFetcher.h"

#include <curl/curl.h>
#include <folly/Memory.h>
#include <folly/Synchronized.h>
#include <folly/init/Init.h>
#include <folly/io/async/EventBaseManager.h>
#include <gflags/gflags.h>
#include <proxygen/httpserver/HTTPServer.h>
#include <proxygen/httpserver/RequestHandlerFactory.h>

using namespace facebook::gorilla;
using namespace proxygen;

using folly::EventBase;
using folly::EventBaseManager;
using folly::SocketAddress;

using Protocol = HTTPServer::Protocol;
DEFINE_int32(http_port, 443, "Port to listen on with HTTP protocol");
DEFINE_string(ip, "::", "IP/Hostname to bind to");
DEFINE_int32(
    threads,
    0,
    "Number of threads to listen on. Numbers <= 0 "
    "will use the number of cores on this machine.");

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

  // initialize type-ahead
  auto mySqlClient = std::make_shared<MySqlClient>();
  mySqlClient->refreshAll();
  TACacheMap typeaheadCache;

  HTTPServerOptions options;
  options.threads = static_cast<size_t>(FLAGS_threads);
  options.idleTimeout = std::chrono::milliseconds(60000);
  options.shutdownOn = {SIGINT, SIGTERM};
  options.enableContentCompression = false;
  options.handlerFactories =
      RequestHandlerChain()
          .addThen<QueryServiceFactory>(mySqlClient, typeaheadCache)
          .build();

  LOG(INFO) << "Starting Beringei Query Service server on port "
            << FLAGS_http_port;
  auto server = std::make_shared<HTTPServer>(std::move(options));
  server->bind(IPs);
  std::thread httpThread([server]() { server->start(); });

  LOG(INFO) << "Starting Topology Update Service";
  // create timer thread
  auto topologyFetch =
      std::make_shared<TopologyFetcher>(mySqlClient, typeaheadCache);
  std::thread topologyFetchThread(
      [&topologyFetch]() { topologyFetch->start(); });

  LOG(INFO) << "Starting Aggregator Service";
  // create timer thread
  auto aggregator = std::make_shared<AggregatorService>(mySqlClient, typeaheadCache);
  std::thread aggThread([&aggregator]() { aggregator->start(); });

  aggThread.join();
  topologyFetchThread.join();
  httpThread.join();
  // clean-up curl memory
  curl_global_cleanup();
  return 0;
}
