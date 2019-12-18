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
DEFINE_string(
    prometheus_cache_uri,
    "http://prometheus_cache:9091/metrics",
    "Prometheus cache queue (push gateway equivalent)");

namespace facebook {
namespace gorilla {

const std::string PROMETHEUS_METRIC_FORMAT = "{}=\"{}\"";

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
    const std::string& jobName,
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
        "{}{} {} {}",
        metric.name,
        labelsString,
        metric.value,
        metric.ts));
  }
  std::string postData = folly::join("\n", prometheusDataPoints) + "\n";
  // make curl request to prometheus cache service
  try {
    CURL* curl;
    CURLcode res;
    curl = curl_easy_init();
    if (!curl) {
      throw std::runtime_error("Unable to initialize CURL");
    }
    // we have to forward the v4 address right now since no local v6
    // we can't verify the peer with our current image/lack of certs
    curl_easy_setopt(curl, CURLOPT_URL, FLAGS_prometheus_cache_uri.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postData.length());
    curl_easy_setopt(curl, CURLOPT_VERBOSE, 0);
    curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1);
    // use a high timeout since the login service can be sluggish
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5000 /* 5 seconds */);
    // read response into string
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curlWriteStringCb);
    std::string curlResponse;
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &curlResponse);
    // make curl request
    long responseCode;
    res = curl_easy_perform(curl);
    if (res == CURLE_OK) {
      curl_easy_getinfo(
          curl, CURLINFO_RESPONSE_CODE, &responseCode);
    }
    // cleanup
    curl_easy_cleanup(curl);
    // ensure success adding to queue
    if (responseCode != 200) {
      VLOG(1) << "Unable to publish metrics to prometheus cache. Response: "
              << responseCode;
      return false;
    }
    if (res != CURLE_OK) {
      LOG(WARNING) << "CURL error for " << FLAGS_prometheus_cache_uri << ": "
                   << curl_easy_strerror(res);
      return false;
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "CURL Error: " << ex.what();
    return false;
  }
  return true;
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
