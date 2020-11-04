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
namespace terragraph {
namespace stats {

std::string PrometheusUtils::formatPrometheusLabelName(
    const std::string& labelName) {
  auto isValidPrometheusLabelChar = [](char c) {
    return !std::isalnum(c) && c != '_';
  };
  return formatPrometheusName(labelName, isValidPrometheusLabelChar);
}

std::string PrometheusUtils::formatPrometheusMetricName(
    const std::string& metricName) {
  auto isValidPrometheusMetricChar = [](char c) {
    return !std::isalnum(c) && c != ':' && c != '_';
  };
  return formatPrometheusName(metricName, isValidPrometheusMetricChar);
}

std::string PrometheusUtils::formatPrometheusName(
    const std::string& metricName,
    const std::function<int(char c)>& isValidPrometheusChar) {
  std::string metricNameCopy{metricName};

  // replace all characters prometheus doesn't like with an underscore
  // https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
  std::replace_if(
      metricNameCopy.begin(), metricNameCopy.end(), isValidPrometheusChar, '_');

  // first char must be a letter
  const char& firstChar = metricNameCopy.front();
  if (!std::isalpha(firstChar) && firstChar != '_') {
    // prefix with underscore
    metricNameCopy = '_' + metricNameCopy;
  }
  return metricNameCopy;
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
            nodeInfo->second.mac_addr),
        folly::sformat(
            PrometheusConsts::METRIC_FORMAT,
            PrometheusConsts::LABEL_RADIO_MAC,
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

    std::string prometheusMetricName = formatPrometheusMetricName(keyName);
    // extra meta-data for short keys
    auto nodeKeyCache =
        metricCacheInstance->getKeyDataByNodeKey(macAddr, keyName);
    if (nodeKeyCache) {
      // publish metric short names
      if (nodeKeyCache->shortName_ref() &&
          !nodeKeyCache->shortName_ref()->empty()) {
        if (nodeKeyCache->linkName_ref() &&
            !nodeKeyCache->linkName_ref()->empty()) {
          // set initial labels for all node stats
          labelTags.push_back(folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_NAME,
              // TODO (T78292848) - we do not need to do this, but NMS is
              // already accounting for it so we need a way of rolling this out
              // without breaking everyone
              formatPrometheusLabelName(*(nodeKeyCache->linkName_ref()))));
          labelTags.push_back(folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_DIRECTION,
              *nodeKeyCache->linkDirection_ref() == thrift::LinkDirection::LINK_A
                  ? "A"
                  : "Z"));
        }
        // has short-name, add it after all tagging
        metricList.emplace_back(Metric(
            formatPrometheusLabelName(*(nodeKeyCache->shortName_ref())),
            stat.timestamp * 1000,
            labelTags,
            stat.value));
      }
    }
    metricList.emplace_back(Metric(
        prometheusMetricName, stat.timestamp * 1000, labelTags, stat.value));
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
  std::string jobNameLabel = "job=\"" + formatPrometheusLabelName(jobName) + "\"";
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

  // curl failed, no response headers/body
  if (!resp) {
    return false;
  }
  // log the http response error
  if (resp && resp->code != 200) {
    LOG(ERROR) << "Failed to publish metrics to prometheus cache. HTTP code: "
               << resp->code;
    LOG(ERROR) << "HTTP response: " << resp->body;
    int i = 0;
    for (const auto& promDataPoint : prometheusDataPoints) {
      LOG(ERROR) << "Failed prometheus push [" << ++i << "]: " << promDataPoint;
    }
  }

  return true;
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
