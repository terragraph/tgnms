/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "TopologyFetcher.h"

#include "TopologyStore.h"

#include <curl/curl.h>
#include <folly/String.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_int32(topology_refresh_interval, 30, "Beringei time period");

extern "C" {
struct HTTPDataStruct {
  char* data;
  size_t size;
};

static size_t
curlWriteCb(void* content, size_t size, size_t nmemb, void* userp) {
  size_t realSize = size * nmemb;
  struct HTTPDataStruct* httpData = (struct HTTPDataStruct*)userp;
  httpData->data =
      (char*)realloc(httpData->data, httpData->size + realSize + 1);
  if (httpData->data == nullptr) {
    printf("Unable to allocate memory (realloc failed)\n");
    return 0;
  }
  memcpy(&(httpData->data[httpData->size]), content, realSize);
  httpData->size += realSize;
  httpData->data[httpData->size] = 0;
  return realSize;
}
}

using apache::thrift::SimpleJSONSerializer;

namespace facebook {
namespace gorilla {

TopologyFetcher::TopologyFetcher(
    std::shared_ptr<MySqlClient> mySqlClient,
    TACacheMap& typeaheadCache)
    : mySqlClient_(mySqlClient), typeaheadCache_(typeaheadCache) {
  // refresh topology time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  // first run
  timerCb();
  timer_->scheduleTimeout(FLAGS_topology_refresh_interval * 1000);
}

void TopologyFetcher::timerCb() {
  timer_->scheduleTimeout(FLAGS_topology_refresh_interval * 1000);
  // fetch topologies from mysql

  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  for (const auto& topologyConfig : mySqlClient_->getTopologyConfigs()) {
    auto topology = fetchTopology(topologyConfig);
    if (topology.nodes.empty()) {
      LOG(INFO) << "Empty topology for: " << topologyConfig->name;
    } else {
      topologyConfig->topology = topology;
      topologyInstance->addTopology(topologyConfig);
      LOG(INFO) << "Topology refreshed for: " << topology.name;
      // load stats type-ahead cache?
      updateTypeaheadCache(topology);
    }
  }
}

void TopologyFetcher::updateTypeaheadCache(query::Topology& topology) {
  try {
    // insert cache handler
    auto taCache = std::make_shared<StatsTypeAheadCache>(mySqlClient_);
    taCache->fetchMetricNames(topology);
    LOG(INFO) << "Type-ahead cache loaded for: " << topology.name;
    // re-insert into the map
    {
      auto locked = typeaheadCache_.wlock();
      auto taCacheIt = locked->find(topology.name);
      if (taCacheIt != locked->end()) {
        taCacheIt->second.swap(taCache);
      } else {
        locked->insert(std::make_pair(topology.name, taCache));
      }
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Unable to update stats typeahead cache for: "
               << topology.name;
  }
}

query::Topology TopologyFetcher::fetchTopology(
    std::shared_ptr<query::TopologyConfig> topologyConfig) {
  query::Topology topology;
  try {
    CURL* curl;
    CURLcode res;
    curl = curl_easy_init();
    if (!curl) {
      throw std::runtime_error("Unable to initialize CURL");
    }
    std::string postData("{}");
    // TODO: make this handle v4/6
    std::string endpoint = folly::sformat(
        "http://{}:{}/api/getTopology",
        topologyConfig->api_ip,
        topologyConfig->api_port);
    LOG(INFO) << "Fetching topology from api endpoint: " << endpoint;
    // we can't verify the peer with our current image/lack of certs
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
    curl_easy_setopt(curl, CURLOPT_URL, endpoint.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postData.length());
    curl_easy_setopt(curl, CURLOPT_VERBOSE, 0);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 1000 /* 1 second */);

    // read data from request
    struct HTTPDataStruct dataChunk;
    dataChunk.data = (char*)malloc(1);
    dataChunk.size = 0;
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &curlWriteCb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&dataChunk);
    res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
      long response_code;
      curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
      // response code 204 is a success
    }
    // cleanup
    curl_easy_cleanup(curl);
    topology =
        SimpleJSONSerializer::deserialize<query::Topology>(dataChunk.data);
    free(dataChunk.data);
    if (res != CURLE_OK) {
      LOG(WARNING) << "CURL error for endpoint " << endpoint << ": "
                   << curl_easy_strerror(res);
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "CURL Error: " << ex.what();
  }
  return topology;
}

void TopologyFetcher::start() {
  eb_.loopForever();
}

} // namespace gorilla
} // namespace facebook
