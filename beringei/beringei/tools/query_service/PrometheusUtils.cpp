/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PrometheusUtils.h"

#include "handlers/StatsHandler.h"

#include <algorithm>
#include <chrono>
#include <utility>

#include <curl/curl.h>

#include <folly/Memory.h>

using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

DEFINE_bool(prometheus_pushgateway_metrics_forwarding_enabled,
            false,
            "Prometheus pushgateway metrics forwarding enable flag");
DEFINE_string(prometheus_pushgateway_ip,
              "[2620:10d:c089:ee04:250:56ff:feb4:b412]",
              "Prometheus endpoint address to forward metrics to");
DEFINE_int32(prometheus_pushgateway_port,
             9091,
             "Prometheus endpoint port");
DEFINE_string(prometheus_pushgateway_uri,
              "/metrics/",
              "Prometheus endpoint uri");

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

std::string
PrometheusUtils::formatPrometheusKeyName(const std::string& keyName) {
  // replace non-alphanumeric characters that prometheus doesn't allow
  std::string keyNameCopy{keyName};
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '.', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '-', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '/', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), '[', '_');
  std::replace(keyNameCopy.begin(), keyNameCopy.end(), ']', '_');
  return keyNameCopy;
}

void
PrometheusUtils::writeNodeMetrics(
    TACacheMap& typeaheadCache,
    const query::StatsWriteRequest& request) {
  if (!FLAGS_prometheus_pushgateway_metrics_forwarding_enabled ||
      request.interval != 30) {
    // only write 30s interval data until we know how to process 1s
    return;
  }
  std::vector<std::string> prometheusDataPoints{};
  // get meta-data for topology
  auto locked = typeaheadCache.rlock();
  auto taCacheIt = locked->find(request.topology.name);
  if (taCacheIt == locked->cend()) {
    LOG(INFO) << "Unable to lookup cache for " << request.topology.name
              << ", dropping request.";
    return;
  }
  auto taCache = taCacheIt->second;
  for (const auto& agent : request.agents) {
    for (const auto& stat : agent.stats) {
      // lower-case the key name and mac address for lookup
      std::string keyName = stat.key;
      std::transform(
          keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
      std::string macAddr = agent.mac;
      std::transform(
          macAddr.begin(), macAddr.end(), macAddr.begin(), ::tolower);
      // fetch meta-data for node/key
      folly::Optional<stats::KeyMetaData> keyMetaData =
          taCache->getKeyDataByNodeKey(macAddr, keyName);
      // replace characters for prometheus label format
      keyName = formatPrometheusKeyName(keyName);
      prometheusDataPoints.push_back(
          folly::sformat("{}{{node=\"{}\"}} {}",
                         keyName,
                         macAddr,
                         stat.value));

      // publish metric short names
      if (keyMetaData && !keyMetaData->shortName.empty()) {
        std::vector<std::string> labelTags{};
        labelTags.push_back(folly::sformat("node=\"{}\"", macAddr));
        if (!keyMetaData->linkName.empty()) {
          // tag link labels
          labelTags.push_back(folly::sformat("link=\"{}\"",
              formatPrometheusKeyName(keyMetaData->linkName)));
          labelTags.push_back(folly::sformat("linkDirection=\"{}\"",
              keyMetaData->linkDirection == stats::LinkDirection::LINK_A ?
              "A" :
              "Z"));
        }
        prometheusDataPoints.push_back(folly::sformat("{}{{{}}} {}",
            keyMetaData->shortName,
            folly::join(",", labelTags),
            stat.value));
      }
    }
  }
  // forward metrics
  if (!prometheusDataPoints.empty()) {
    forwardMetricsToPrometheus(request.topology.name,
                               "node_metrics" /* unique job identifier */,
                               prometheusDataPoints);
  }
}

void
PrometheusUtils::writeMetrics(
    const std::string& topologyName,
    const std::string& jobName, /* unique identifier */
    const std::vector<Metric>& aggValues) {
  if (!FLAGS_prometheus_pushgateway_metrics_forwarding_enabled) {
    return;
  }
  std::vector<std::string> prometheusDataPoints{};
  for (const auto& aggValue : aggValues) {
    std::string labelsString{};
    if (!aggValue.prometheusLabels.empty()) {
      labelsString = "{" + folly::join(",", aggValue.prometheusLabels) +
          "}";
    }
    prometheusDataPoints.push_back(folly::sformat("{}{} {}",
        aggValue.name,
        labelsString,
        aggValue.value));
  }
  // forward metrics
  if (!prometheusDataPoints.empty()) {
    forwardMetricsToPrometheus(topologyName, jobName, prometheusDataPoints);
  }
}

void
PrometheusUtils::forwardMetricsToPrometheus(
    const std::string& topologyName,
    const std::string& jobName, /* unique identifier */
    const std::vector<std::string>& prometheusDataPoints) {

  time_t startTime = BeringeiReader::getTimeInMs();
  // join data points with newline
  const std::string postData = folly::join("\n", prometheusDataPoints) + "\n";
  // construct login request
  struct curl_slist* headerList = NULL;
  // we need to specify the content type to get a valid response
  headerList = curl_slist_append(headerList,
      "Content-Type: application/x-www-form-urlencoded");
  try {
    CURL* curl;
    CURLcode res;
    curl = curl_easy_init();
    if (!curl) {
      throw std::runtime_error("Unable to initialize CURL");
    }
    // url escaping
    char* jobNameEscaped =
        curl_easy_escape(curl, jobName.c_str(), jobName.length());
    char* topologyNameEscaped =
        curl_easy_escape(curl, topologyName.c_str(), topologyName.length());
    // craft pushgateway endpoint url to include job + network
    const std::string endpoint(folly::sformat(
        "http://{}:{}{}job/{}/network/{}",
        FLAGS_prometheus_pushgateway_ip,
        FLAGS_prometheus_pushgateway_port,
        FLAGS_prometheus_pushgateway_uri,
        jobNameEscaped,
        topologyNameEscaped));
    // we can't verify the peer with our current image/lack of certs
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0);
    curl_easy_setopt(curl, CURLOPT_URL, endpoint.c_str());
    if (!postData.empty()) {
      curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
      curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postData.length());
    }
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
    // make curl request
    res = curl_easy_perform(curl);
    long responseCode;
    if (res == CURLE_OK) {
      curl_easy_getinfo(
          curl, CURLINFO_RESPONSE_CODE, &responseCode);
    }
    time_t endTime = BeringeiReader::getTimeInMs();
    // validate the response
    if (responseCode == 202) {
      LOG(INFO) << "Successfully sent " << prometheusDataPoints.size()
                << " data-points to prometheus pushgateway in "
                << (endTime - startTime) << "ms";
    } else {
      LOG(ERROR) << "Failure sending to prometheus pushgateway ("
                 << endpoint << "), response code: " << responseCode;
      if (dataChunk.size > 0) {
        const std::string httpResp(
            reinterpret_cast<const char*>(dataChunk.data), dataChunk.size);
        LOG(ERROR) << "\tHTTP Error: " << httpResp;
      }
    }
    // cleanup
    curl_slist_free_all(headerList);
    curl_easy_cleanup(curl);
    free(dataChunk.data);
    if (res != CURLE_OK) {
      LOG(WARNING) << "CURL error for endpoint " << endpoint << ": "
                   << curl_easy_strerror(res);
    }
  } catch (const std::exception& ex) {
    LOG(ERROR) << "CURL Error: " << ex.what();
  }
}

} // namespace gorilla
} // namespace facebook
