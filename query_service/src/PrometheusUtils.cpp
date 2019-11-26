/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PrometheusUtils.h"

#include "MetricCache.h"
#include "StatsUtils.h"

#include "consts/PrometheusConsts.h"

#include <algorithm>
#include <chrono>
#include <utility>

#include <folly/Memory.h>

using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

// Maximum count to accept (of vectors of Metrics)
DEFINE_int32(
    prometheus_metrics_queue_size,
    1000000 /* one million metrics */,
    "Total stats requests accepted per interval");
DEFINE_string(
    prometheus_network_name_label,
    "network",
    "Prometheus network/topology name label");
DEFINE_string(
    kafka_health_topic,
    "health_stats",
    "Kafka topic for link health statistics");

namespace facebook {
namespace gorilla {

const std::string PROMETHEUS_METRIC_FORMAT = "{}=\"{}\"";

static folly::Singleton<PrometheusUtils> instance_;

PrometheusUtils::PrometheusUtils() {
  // populate allowable intervals
  std::vector<Metric> req;
  nodeMetricsByInterval_.wlock()->emplace(std::make_pair(1, req));
  nodeMetricsByInterval_.wlock()->emplace(std::make_pair(30, req));
}

std::shared_ptr<PrometheusUtils> PrometheusUtils::getInstance() {
  return instance_.try_get();
}

std::vector<std::string> PrometheusUtils::pollMetrics(const int intervalSec) {
  std::vector<std::string> prometheusDataPoints{};
  std::vector<Metric> prometheusMetrics{};
  // drain metrics from the queue
  {
    // lock for the duration
    auto locked = nodeMetricsByInterval_.wlock();
    auto intervalIt = locked->find(intervalSec);
    if (intervalIt == locked->end()) {
      return prometheusDataPoints;
    }
    // loop through all Metrics
    for (const auto& prometheusMetric : intervalIt->second) {
      // format all metrics to prometheus string format
      std::string labelsString{};
      if (!prometheusMetric.prometheusLabels.empty()) {
        labelsString =
            "{" + folly::join(",", prometheusMetric.prometheusLabels) + "}";
      }
      prometheusDataPoints.push_back(folly::sformat(
          "{}{} {} {}",
          prometheusMetric.name,
          labelsString,
          prometheusMetric.value,
          prometheusMetric.ts));
    }
    intervalIt->second.clear();
  }
  return prometheusDataPoints;
}

bool PrometheusUtils::isQueueFull(const int intervalSec) {
  auto locked = nodeMetricsByInterval_.rlock();
  auto intervalIt = locked->find(intervalSec);
  if (intervalIt != locked->end()) {
    return intervalIt->second.size() >= FLAGS_prometheus_metrics_queue_size;
  }
  return false;
}

std::string PrometheusUtils::formatNetworkLabel(
    const std::string& topologyName) {
  return folly::sformat(
      PROMETHEUS_METRIC_FORMAT,
      FLAGS_prometheus_network_name_label,
      topologyName);
}

std::string PrometheusUtils::formatPrometheusKeyName(
    const std::string& keyName) {
  // replace non-alphanumeric characters that prometheus doesn't allow
  std::string keyNameCopy{keyName};
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '.', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '-', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '/', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '[', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), ']', '_');
  return keyNameCopy;
}

bool PrometheusUtils::writeNodeStats(
    const int intervalSec,
    const std::vector<terragraph::thrift::AggrStat>& statQueue) {
  std::vector<Metric> metricList{};
  auto metricCacheInstance = MetricCache::getInstance();
  // loop over input metric list
  int droppedMetrics = 0;
  for (const auto& stat : statQueue) {
    std::string macAddr = StatsUtils::toLowerCase(stat.entity);
    // lookup meta-data for node
    auto nodeInfo = metricCacheInstance->getNodeByMacAddr(macAddr);
    if (!nodeInfo) {
      VLOG(2) << "No meta-data for MAC: " << macAddr
              << ", dropping stats request";
      droppedMetrics++;
      continue;
    }
    std::string keyName = StatsUtils::toLowerCase(stat.key);
    std::vector<std::string> labelTags = {
        PrometheusUtils::formatNetworkLabel(nodeInfo->first),
        folly::sformat(
            PROMETHEUS_METRIC_FORMAT,
            PrometheusConsts::LABEL_DATA_INTERVAL,
            intervalSec),
        folly::sformat(
            PROMETHEUS_METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_MAC,
            macAddr),
        folly::sformat(
            PROMETHEUS_METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_NAME,
            nodeInfo->second.name),
        folly::sformat(
            PROMETHEUS_METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_IS_POP,
            nodeInfo->second.pop_node ? "true" : "false"),
        folly::sformat(
            PROMETHEUS_METRIC_FORMAT,
            PrometheusConsts::LABEL_SITE_NAME,
            nodeInfo->second.site_name)};
    std::string prometheusKeyName = formatPrometheusKeyName(keyName);
    // extra meta-data for short keys
    auto nodeKeyCache = metricCacheInstance->getNodeMetricCache(macAddr);
    if (nodeKeyCache) {
      auto keyIt = nodeKeyCache->find(keyName);
      // publish metric short names
      if (keyIt != nodeKeyCache->end() && !keyIt->second.shortName.empty()) {
        if (!keyIt->second.linkName.empty()) {
          // set initial labels for all node stats
          labelTags.push_back(folly::sformat(
              PROMETHEUS_METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_NAME,
              formatPrometheusKeyName(keyIt->second.linkName)));
          labelTags.push_back(folly::sformat(
              PROMETHEUS_METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_DIRECTION,
              keyIt->second.linkDirection == stats::LinkDirection::LINK_A
                  ? "A"
                  : "Z"));
        }
        // has short-name, add it after all tagging
        metricList.emplace_back(Metric(
            formatPrometheusKeyName(keyIt->second.shortName),
            stat.timestamp * 1000,
            labelTags,
            stat.value));
      }
    }
    metricList.emplace_back(Metric(
        prometheusKeyName, stat.timestamp * 1000, labelTags, stat.value));
  }
  VLOG(1) << "Dropped " << droppedMetrics << "/" << statQueue.size()
          << " stats from missing meta-data.";
  return enqueueMetrics(intervalSec, metricList);
}

bool PrometheusUtils::enqueueMetrics(
    const int intervalSec,
    const std::vector<Metric>& metricList) {
  // save metrics in local queue for prometheus to query
  auto locked = nodeMetricsByInterval_.wlock();
  auto intervalIt = locked->find(intervalSec);
  if (intervalIt != locked->end()) {
    // always accept metrics into the queue so they don't get dropped from kafka
    std::copy(
        metricList.begin(),
        metricList.end(),
        std::back_inserter(intervalIt->second));
    return true;
  }
  return false;
}

struct CurlResponse PrometheusUtils::prometheusQuery(
    const std::string& uri,
    const std::vector<std::pair<std::string, std::string>>& postData) {
  struct CurlResponse curlResponse;
  // construct login request
  struct curl_slist* headerList = NULL;
  // we need to specify the content type to get a valid response
  headerList = curl_slist_append(
      headerList, "Content-Type: application/x-www-form-urlencoded");
  try {
    CURL* curl;
    CURLcode res;
    curl = curl_easy_init();
    if (!curl) {
      throw std::runtime_error("Unable to initialize CURL");
    }
    // construct URL-escaped post data
    std::vector<std::string> postDataStrList{};
    for (const auto& postPair : postData) {
      // url escape the value
      char* escapedValue = curl_easy_escape(
          curl, postPair.second.c_str(), postPair.second.length());
      std::string escapedValueStr{escapedValue};
      curl_free(escapedValue);
      postDataStrList.push_back(
          folly::sformat("{}={}", postPair.first, escapedValueStr));
    }
    std::string postDataStr = folly::join("&", postDataStrList);
    // we have to forward the v4 address right now since no local v6
    // we can't verify the peer with our current image/lack of certs
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0);
    curl_easy_setopt(curl, CURLOPT_URL, uri.c_str());
    // char *postDataEncoded = curl_easy_escape(curl, postData.c_str(), );
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postDataStr.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postDataStr.length());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerList);
    curl_easy_setopt(curl, CURLOPT_VERBOSE, 0);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1);
    // use a high timeout since the login service can be sluggish
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15000 /* 15 seconds */);

    // read data from request
    struct HTTPDataStruct dataChunk;
    dataChunk.data = (char*)malloc(1);
    dataChunk.size = 0;
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &curlWriteCb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&dataChunk);
    // read header data
    struct HTTPDataStruct headerChunk;
    headerChunk.data = (char*)malloc(1);
    headerChunk.size = 0;
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, (void*)&headerChunk);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, &curlWriteCb);
    // make curl request
    res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
      curl_easy_getinfo(
          curl, CURLINFO_RESPONSE_CODE, &curlResponse.responseCode);
    }
    // fill the response
    curlResponse.header = headerChunk.data;
    curlResponse.body = dataChunk.data;
    // cleanup
    curl_slist_free_all(headerList);
    curl_easy_cleanup(curl);
    free(dataChunk.data);
    free(headerChunk.data);
    if (res != CURLE_OK) {
      LOG(WARNING) << "CURL error for " << uri << ": "
                   << curl_easy_strerror(res);
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "CURL Error: " << ex.what();
  }
  // return the header and body separately
  return curlResponse;
}

} // namespace gorilla
} // namespace facebook
