/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PrometheusUtils.h"

#include <algorithm>
#include <chrono>
#include <utility>

#include <folly/Memory.h>

#include "CurlUtil.h"
#include "MetricCache.h"
#include "StatsUtils.h"
#include "consts/PrometheusConsts.h"

using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

// Maximum count to accept (of vectors of Metrics)
DEFINE_int32(
    prometheus_metrics_queue_size,
    1000000 /* one million metrics */,
    "Total stats requests accepted per interval");
DEFINE_string(
    kafka_health_topic,
    "health_stats",
    "Kafka topic for link health statistics");
DEFINE_string(
    prometheus_cache_uri,
    "http://prometheus_cache:9091/metrics",
    "Prometheus cache queue (push gateway equivalent)");

namespace facebook {
namespace gorilla {

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
    const std::string& jobName,
    const int intervalSec,
    const std::vector<terragraph::thrift::AggrStat>& statQueue) {
  std::vector<Metric> metricList{};
  auto metricCacheInstance = MetricCache::getInstance();
  // loop over input metric list
  int droppedMetrics = 0;
  for (const auto& stat : statQueue) {
    if (!stat.entity_ref()) {
      continue;
    }
    std::string macAddr = StatsUtils::toLowerCase(*stat.entity_ref());
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
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NETWORK,
            nodeInfo->first),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_DATA_INTERVAL,
            intervalSec),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_MAC,
            macAddr),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_NAME,
            nodeInfo->second.name),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_NODE_IS_POP,
            nodeInfo->second.pop_node ? "true" : "false"),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_SITE_NAME,
            nodeInfo->second.site_name)};
    std::string prometheusKeyName = formatPrometheusKeyName(keyName);
    // extra meta-data for short keys
    auto nodeKeyCache = metricCacheInstance->getNodeMetricCache(macAddr);
    if (nodeKeyCache) {
      auto keyIt = nodeKeyCache->find(keyName);
      // publish metric short names
      if (keyIt != nodeKeyCache->end() &&
          keyIt->second.shortName_ref() &&
	  !keyIt->second.shortName_ref()->empty()) {
        if (keyIt->second.linkName_ref() &&
	    !keyIt->second.linkName_ref()->empty()) {
          // set initial labels for all node stats
          labelTags.push_back(folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_NAME,
              formatPrometheusKeyName(*(keyIt->second.linkName_ref()))));
          labelTags.push_back(folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_DIRECTION,
              *keyIt->second.linkDirection_ref() == stats::LinkDirection::LINK_A
                  ? "A"
                  : "Z"));
        }
        // has short-name, add it after all tagging
        metricList.emplace_back(Metric(
            formatPrometheusKeyName(*(keyIt->second.shortName_ref())),
            stat.timestamp * 1000,
            labelTags,
            stat.value));
      }
    }
    metricList.emplace_back(Metric(
        prometheusKeyName, stat.timestamp * 1000, labelTags, stat.value));
  }
  if (droppedMetrics > 0) {
    LOG(ERROR) << "Dropped " << droppedMetrics << "/" << statQueue.size()
               << " stats from missing meta-data.";
  }
  return enqueueMetrics(jobName, metricList);
}

bool PrometheusUtils::enqueueMetrics(
    const std::string& jobName,
    const std::vector<Metric>& metricList) {
  std::vector<std::string> prometheusDataPoints{};
  if (metricList.empty()) {
    // empty metrics list, no error
    return true;
  }

  // build curl request from metrics list
  std::string jobNameLabel = "job=\"" + formatPrometheusKeyName(jobName) + "\"";
  for (const auto& metric : metricList) {
    // format all metrics to prometheus string format
    std::string labelsString{};
    if (!metric.prometheusLabels.empty()) {
      // add job name
      labelsString = "{" + folly::join(",", metric.prometheusLabels) + "," +
          jobNameLabel + "}";
    } else {
      labelsString = "{" + jobNameLabel + "}";
    }
    prometheusDataPoints.push_back(folly::sformat(
        "{}{} {} {}", metric.name, labelsString, metric.value, metric.ts));
  }
  std::string postData = folly::join("\n", prometheusDataPoints) + "\n";

  // make curl request to prometheus cache service
  auto resp = CurlUtil::makeHttpRequest(
      5 /* timeoutSeconds */, FLAGS_prometheus_cache_uri, postData);
  if (!resp || resp->code != 200) {
    LOG(ERROR) << "Failed to publish metrics to prometheus cache";
    return false;
  }

  return true;
}

} // namespace gorilla
} // namespace facebook
