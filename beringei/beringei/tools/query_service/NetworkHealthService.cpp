/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "NetworkHealthService.h"

#include "KafkaStatsService.h"
#include "MetricCache.h"
#include "StatsUtils.h"
#include "TopologyStore.h"
#include "consts/PrometheusConsts.h"

#include <cppkafka/configuration.h>
#include <cppkafka/consumer.h>
#include <folly/String.h>
#include <folly/ThreadName.h>
#include <folly/io/async/AsyncTimeout.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <cmath>

DEFINE_int32(health_process_delay, 30, "Frequency to calculate health");
DEFINE_string(
    kafka_link_stats_group_id,
    "health_service",
    "Kafka link stats group id");
DEFINE_double(fw_uptime_slope, 39, "Expected counter rate for fw_uptime key");

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::seconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

NetworkHealthService::NetworkHealthService(
    const std::string& brokerEndpointList)
    : brokerEndpointList_(brokerEndpointList) {
  consumeThread_ = std::thread([this]() {
    folly::setThreadName("Network Health Service");
    this->consume("link_stats");
  });
  // only record the keys we're interested in
  healthKeys_ = {"fw_uptime", "link_avail"};
}

NetworkHealthService::~NetworkHealthService() {
  consumeThread_.join();
}

void NetworkHealthService::consume(const std::string& topicName) {
  // Kafka configuration for all topics
  cppkafka::Configuration kafkaConfig = {
      {"metadata.broker.list", brokerEndpointList_},
      {"group.id", FLAGS_kafka_link_stats_group_id},
  };
  folly::Optional<cppkafka::TopicPartitionList> assignedPartitionList{
      folly::none};
  cppkafka::Consumer kafkaConsumer(kafkaConfig);
  kafkaConsumer.set_assignment_callback(
      [&](const cppkafka::TopicPartitionList& partitions) {
        LOG(INFO) << "Partition assignment updated " << partitions;
        assignedPartitionList = partitions;
      });
  // Print the revoked partitions on revocation
  kafkaConsumer.set_revocation_callback(
      [&](const cppkafka::TopicPartitionList& partitions) {
        LOG(INFO) << "Partition assignment revoked " << partitions;
        assignedPartitionList = partitions;
      });
  try {
    kafkaConsumer.subscribe({topicName});
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Subscribe error: " << ex.what();
    return;
  }
  // Now read lines and write them into kafka
  bool isRunning = true;
  std::chrono::milliseconds timeoutMs(1000);
  auto prometheusInstance = PrometheusUtils::getInstance();
  auto metricCacheInstance = MetricCache::getInstance();
  // queue stats for Prometheus lookup
  time_t lastRun = StatsUtils::getTimeInMs();
  while (isRunning) {
    // poll for new messages
    cppkafka::Message msg = kafkaConsumer.poll(timeoutMs /* 1 second */);
    if (msg) {
      if (msg.get_error()) {
        // Ignore EOF notifications from rdkafka
        if (!msg.is_eof()) {
          LOG(ERROR) << "Received error notification: " << msg.get_error();
        }
      } else {
        const std::string statMsg = msg.get_payload();
        if (assignedPartitionList.hasValue()) {
          VLOG(2) << "Topic: " << topicName
                  << ", group: " << *assignedPartitionList
                  << ", msg: " << statMsg;
        } else {
          VLOG(2) << "Topic: " << topicName << ", msg: " << statMsg;
        }
        // Decode JSON and add to Prometheus queue
        auto stat =
            SimpleJSONSerializer::deserialize<terragraph::thrift::AggrStat>(
                statMsg);
        std::string keyName = stat.key;
        std::transform(
            keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
        // skip non-health metrics
        if (!healthKeys_.count(keyName)) {
          VLOG(4) << "Dropping non-health key: " << keyName;
          kafkaConsumer.commit(msg);
          continue;
        }
        std::string macAddr = stat.entity;
        std::transform(
            macAddr.begin(), macAddr.end(), macAddr.begin(), ::tolower);
        // lookup meta-data for node
        auto nodeKeyInfo =
            metricCacheInstance->getKeyDataByNodeKey(macAddr, keyName);
        if (!nodeKeyInfo) {
          VLOG(1) << "No cache for: " << macAddr << "/" << keyName;
          kafkaConsumer.commit(msg);
          continue;
        }
        if (nodeKeyInfo->topologyName.empty()) {
          VLOG(1) << "No topology name set for: " << macAddr;
          continue;
        }
        // record sample for batch processing
        linkHealthStats_[nodeKeyInfo->topologyName][nodeKeyInfo->linkName]
                        [keyName][nodeKeyInfo->linkDirection][stat.timestamp] =
                            stat.value;
        // Mark the message as committed
        // We can miss processing part of the queue this way, so we need to be
        // careful to process as much data prior to the commit
        kafkaConsumer.commit(msg);
      }
    }
    time_t nowInMs = StatsUtils::getTimeInMs();
    if ((lastRun + FLAGS_health_process_delay * 1000) < nowInMs) {
      // run batching
      linkHealthUpdater();
      // reset last run
      lastRun = StatsUtils::getTimeInMs();
    }
  }
}

void NetworkHealthService::linkHealthUpdater() {
  auto mysqlInstance = MySqlClient::getInstance();
  // fetch a map of linkName -> latest event (by end time)
  auto linkState = mysqlInstance->refreshLatestLinkState();
  if (!linkState) {
    LOG(ERROR) << "Error fetching link state from DB";
    return;
  }
  // check each link if it got a new sample
  for (auto& topologyNamePair : linkHealthStats_) {
    const std::string& topologyName = topologyNamePair.first;
    for (auto& linkPair : topologyNamePair.second) {
      const std::string& linkName = linkPair.first;
      for (auto& shortNamePair : linkPair.second) {
        // only use fw_uptime
        if (shortNamePair.first != "fw_uptime") {
          continue;
        }
        // process events separately for each link direction
        for (auto& linkDirPair : shortNamePair.second) {
          processFwUptimeHealth(
              topologyName,
              linkName,
              linkDirPair.first /* link direction */,
              linkDirPair.second /* data points */,
              *linkState /* last known link state from DB */);
        }
      }
    }
  }
}

bool NetworkHealthService::markLinkOnline(
    const std::string& topologyName,
    const std::string& linkName,
    const stats::LinkDirection& linkDir,
    const LinkStateMap& linkStateMap,
    const stats::LinkStateType& linkState,
    const long counterValue,
    const time_t startTs,
    const time_t endTs) noexcept {
  // no data for link
  folly::Optional<stats::EventDescription> lastState;
  // fetch last state
  auto lastLinkState = linkStateMap.find(linkName);
  if (lastLinkState != linkStateMap.end()) {
    auto lastLinkDirState = lastLinkState->second.find(linkDir);
    if (lastLinkDirState != lastLinkState->second.end()) {
      lastState = lastLinkDirState->second;
    }
  }
  auto mysqlInstance = MySqlClient::getInstance();
  if (!lastState) {
    // insert new event
    mysqlInstance->addLinkState(
        topologyName,
        linkName,
        linkDir,
        stats::LinkStateType::LINK_UP,
        startTs,
        endTs);
    return true;
  } else {
    // event exists for this link + direction
    const time_t tsDiff = endTs - lastState->endTime;
    const long expectedValue = tsDiff * FLAGS_fw_uptime_slope;
    // end ts already newer, skip
    if (tsDiff <= 0) {
      return false;
    }
    // update existing if covers period since last end time
    if (counterValue > expectedValue) {
      mysqlInstance->updateLinkState(lastState->dbId, endTs);
    } else {
      // insert new if not fully covered window
      mysqlInstance->addLinkState(
          topologyName,
          linkName,
          linkDir,
          stats::LinkStateType::LINK_UP,
          startTs,
          endTs);
      return true;
    }
  }
  return false;
}

void NetworkHealthService::processFwUptimeHealth(
    const std::string& topologyName,
    const std::string& linkName,
    const stats::LinkDirection& linkDirection,
    std::map<time_t /* ts */, double /* value */>& fwUptimeDatapoints,
    const LinkStateMap& linkState) {
  if (fwUptimeDatapoints.empty()) {
    return;
  }
  auto mysqlInstance = MySqlClient::getInstance();
  // fast-track the update by only using the last value when possible
  if (fwUptimeDatapoints.size() >= 2) {
    const double tsDiff =
        (--fwUptimeDatapoints.end())->first - fwUptimeDatapoints.begin()->first;
    const double lastValue = (--fwUptimeDatapoints.end())->second;
    const double valueDiff = lastValue - fwUptimeDatapoints.begin()->second;
    const double valueRate = valueDiff / tsDiff;
    // is this check good enough? or should we ensure no rolls too?
    if (valueRate >= FLAGS_fw_uptime_slope) {
      const time_t startTs =
          (--fwUptimeDatapoints.end())->first /* latest time */ -
          lastValue / FLAGS_fw_uptime_slope;
        bool needsRefresh = markLinkOnline(
          topologyName,
          linkName,
          linkDirection,
          linkState,
          stats::LinkStateType::LINK_UP,
          lastValue /* counter value */,
          startTs,
          (--fwUptimeDatapoints.end())->first /* end ts */);
      fwUptimeDatapoints.clear();
      // we aren't updating the table cache after adding an entry, so
      // subsequent writes could generate duplicate ids
      return;
    }
  }

  // loop over each <ts, value> pair to determine if the interval
  // was online
  for (const auto& timePair : fwUptimeDatapoints) {
    const time_t ts = timePair.first;
    const double counterValue = (double)timePair.second;
    if (counterValue == 0) {
      // link not online, nothing to do
      continue;
    }
    const time_t startTs = ts - (counterValue / FLAGS_fw_uptime_slope);
    bool needsRefresh = markLinkOnline(
        topologyName,
        linkName,
        linkDirection,
        linkState,
        stats::LinkStateType::LINK_UP,
        counterValue,
        startTs,
        ts /* end ts */);
    if (needsRefresh) {
      // exit function to force db refresh before next run
      return;
    }
  }
  // clean-up records
  fwUptimeDatapoints.clear();
}

} // namespace gorilla
} // namespace facebook
