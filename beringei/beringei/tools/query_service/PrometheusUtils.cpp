/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PrometheusUtils.h"

#include "consts/PrometheusConsts.h"
#include "handlers/StatsHandler.h"

#include <algorithm>
#include <chrono>
#include <utility>

#include <curl/curl.h>

#include <folly/Memory.h>

using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

DEFINE_bool(
    prometheus_metrics_queue_enabled,
    true,
    "Maintain a queue of prometheus metrics for prometheus to poll");
// Maximum count to accept (of vectors of Metrics)
DEFINE_int32(
    prometheus_metrics_queue_size,
    100,
    "Total stats requests accepted per interval");
DEFINE_string(
    prometheus_network_name_label,
    "network",
    "Prometheus network/topology name label");

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

namespace facebook {
namespace gorilla {

static folly::Singleton<PrometheusUtils> instance_;

PrometheusUtils::PrometheusUtils() {
  // populate allowable intervals
  std::vector<std::vector<Metric>> req;
  nodeMetricsByInterval_.wlock()->emplace(std::make_pair(1, req));
  nodeMetricsByInterval_.wlock()->emplace(std::make_pair(30, req));
}

std::shared_ptr<PrometheusUtils> PrometheusUtils::getInstance() {
  return instance_.try_get();
}

std::vector<std::string> PrometheusUtils::pollMetrics(
    TACacheMap& typeaheadCache,
    const int intervalSec) {
  std::vector<std::string> prometheusDataPoints{};
  std::vector<std::vector<Metric>> prometheusMetrics{};
  // drain metrics from the queue
  {
    // lock for the duration
    auto locked = nodeMetricsByInterval_.wlock();
    auto intervalIt = locked->find(intervalSec);
    if (intervalIt == locked->end()) {
      return prometheusDataPoints;
    }
    // collect all Metric data
    while (!intervalIt->second.empty()) {
      const auto metricsList = intervalIt->second.begin();
      prometheusMetrics.emplace_back(*metricsList);
      intervalIt->second.erase(metricsList);
    }
  }
  // format all metrics to prometheus string format
  for (const auto& metricList : prometheusMetrics) {
    for (const auto& prometheusMetric : metricList) {
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
  }
}

std::string PrometheusUtils::formatNetworkLabel(
    const std::string& topologyName) {
  return folly::sformat(
      "{}=\"{}\"", FLAGS_prometheus_network_name_label, topologyName);
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

void PrometheusUtils::writeNodeMetrics(
    TACacheMap& typeaheadCache,
    const query::StatsWriteRequest& request) {
  // ensure we're accepting the stats data interval
  if (!FLAGS_prometheus_metrics_queue_enabled ||
      !nodeMetricsByInterval_.rlock()->count(request.interval)) {
    return;
  }

  // format stats request as a list of Metrics
  std::vector<Metric> prometheusMetrics{};
  formatStatsRequestAsPrometheusMetrics(
      prometheusMetrics, typeaheadCache, request);
  {
    // save metrics in local queue for prometheus to query
    auto locked = nodeMetricsByInterval_.wlock();
    auto intervalIt = locked->find(request.interval);
    if (intervalIt != locked->end()) {
      if (intervalIt->second.size() >= FLAGS_prometheus_metrics_queue_size) {
        LOG(ERROR) << "Metrics queue full for interval: " << request.interval
                   << ", dropping request.";
        return;
      }
      // push metrics to local instance to be pulled by prometheus directly
      intervalIt->second.emplace_back(prometheusMetrics);
    }
  }
}

void PrometheusUtils::formatStatsRequestAsPrometheusMetrics(
    std::vector<Metric>& prometheusMetricOutput,
    TACacheMap& typeaheadCache,
    const query::StatsWriteRequest& request) {
  // get meta-data for topology
  auto locked = typeaheadCache.rlock();
  auto taCacheIt = locked->find(request.topology.name);
  if (taCacheIt == locked->cend()) {
    LOG(INFO) << "Unable to lookup cache for " << request.topology.name
              << ", dropping request.";
    return;
  }
  auto taCache = taCacheIt->second;
  std::string topologyLabel =
      PrometheusUtils::formatNetworkLabel(request.topology.name);

  for (const auto& agent : request.agents) {
    for (const auto& stat : agent.stats) {
      // lower-case the key name and mac address for lookup
      std::string keyName = stat.key;
      std::transform(
          keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
      std::string macAddr = agent.mac;
      std::transform(
          macAddr.begin(), macAddr.end(), macAddr.begin(), ::tolower);
      // set initial labels for all node stats
      std::vector<std::string> labelTags = {
          topologyLabel,
          folly::sformat(
              "{}=\"{}\"",
              PrometheusConsts::LABEL_DATA_INTERVAL,
              request.interval),
          folly::sformat(
              "{}=\"{}\"", PrometheusConsts::LABEL_NODE_MAC, macAddr),
          folly::sformat(
              "{}=\"{}\"", PrometheusConsts::LABEL_NODE_NAME, agent.name),
          folly::sformat(
              "{}=\"{}\"", PrometheusConsts::LABEL_SITE_NAME, agent.site)};
      // fetch meta-data for node/key
      folly::Optional<stats::KeyMetaData> keyMetaData =
          taCache->getKeyDataByNodeKey(macAddr, keyName);
      // replace characters for prometheus label format
      keyName = formatPrometheusKeyName(keyName);
      // push the raw metric before checking for link tags
      // this prevents creating a new time series in prometheus when we add a
      // short name for this metric later
      // I don't feel strongly about this either way (pm@)
      prometheusMetricOutput.emplace_back(
          Metric(keyName, stat.ts * 1000, labelTags, stat.value));
      // publish metric short names
      if (keyMetaData && !keyMetaData->shortName.empty()) {
        if (!keyMetaData->linkName.empty()) {
          // tag link labels
          labelTags.push_back(folly::sformat(
              "{}=\"{}\"",
              PrometheusConsts::LABEL_LINK_NAME,
              formatPrometheusKeyName(keyMetaData->linkName)));
          labelTags.push_back(folly::sformat(
              "{}=\"{}\"",
              PrometheusConsts::LABEL_LINK_DIRECTION,
              keyMetaData->linkDirection == stats::LinkDirection::LINK_A
                  ? "A"
                  : "Z"));
        }
        prometheusMetricOutput.emplace_back(Metric(
            keyMetaData->shortName, stat.ts * 1000, labelTags, stat.value));
      }
    }
  }
}

void PrometheusUtils::writeMetrics(
    const std::string& topologyName,
    const std::string& jobName, /* unique identifier */
    const int intervalSec,
    const std::vector<Metric>& aggValues) {
  if (!FLAGS_prometheus_metrics_queue_enabled) {
    return;
  }
  // write metrics to local cache
  {
    // save metrics in local queue for prometheus to query
    auto locked = nodeMetricsByInterval_.wlock();
    auto intervalIt = locked->find(intervalSec);
    if (intervalIt != locked->end()) {
      intervalIt->second.emplace_back(aggValues);
    }
  }
}

} // namespace gorilla
} // namespace facebook
