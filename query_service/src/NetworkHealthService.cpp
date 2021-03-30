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
#include "PrometheusUtils.h"
#include "StatsUtils.h"
#include "TopologyStore.h"
#include "consts/PrometheusConsts.h"

#include <cppkafka/configuration.h>
#include <cppkafka/consumer.h>
#include <folly/String.h>
#include <folly/io/async/AsyncTimeout.h>
#include <folly/system/ThreadName.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
#include <cmath>

#include "if/gen-cpp2/Topology_types_custom_protocol.h"

DEFINE_int32(health_process_delay, 30, "Frequency to calculate health");
DEFINE_string(
    kafka_link_stats_group_id,
    "health_service",
    "Kafka link stats group id");
DEFINE_int32(
    link_availability_query_window_h,
    24,
    "Query interval for link availability");
DEFINE_int32(
    link_availability_allowed_data_delay_s,
    120,
    "Allowed data delay for link availability");

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::seconds;
using std::chrono::system_clock;

namespace facebook {
namespace terragraph {
namespace stats {

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
      // necessary for a single thread to keep up with a few hundred nodes
      {"enable.auto.commit", true},
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
  auto metricCacheInstance = MetricCache::getInstance();
  // queue stats for meta-data lookup
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
        // Decode stat JSON
        auto stat =
            SimpleJSONSerializer::deserialize<terragraph::thrift::AggrStat>(
                statMsg);
        std::string macAddr = StatsUtils::toLowerCase(*stat.entity_ref());
        std::string keyName = StatsUtils::toLowerCase(stat.key);
        // lookup meta-data for node
        auto nodeKeyInfo =
            metricCacheInstance->getKeyDataByNodeKey(macAddr, keyName);
        // skip non-health metrics
        if (!nodeKeyInfo || !nodeKeyInfo->shortName_ref() ||
            nodeKeyInfo->shortName_ref()->empty() ||
            !healthKeys_.count(*nodeKeyInfo->shortName_ref())) {
          VLOG(3) << "Dropping non-health key: " << keyName;
          continue;
        }
        if (!nodeKeyInfo->topologyName_ref() ||
            nodeKeyInfo->topologyName_ref()->empty()) {
          VLOG(3) << "No topology name defined for: " << macAddr
                  << ", key: " << keyName;
          continue;
        }
        if (!nodeKeyInfo->linkName_ref() ||
            nodeKeyInfo->linkName_ref()->empty()) {
          VLOG(3) << "No link name defined for: " << macAddr
                  << ", key: " << keyName;
          continue;
        }
        if (assignedPartitionList.hasValue()) {
          VLOG(2) << "Topic: " << topicName
                  << ", group: " << *assignedPartitionList
                  << ", msg: " << statMsg << ", delay: "
                  << (StatsUtils::getDurationString(
                         StatsUtils::getTimeInMs() / 1000 - stat.timestamp));
        } else {
          VLOG(2) << "Topic: " << topicName << ", msg: " << statMsg;
        }
        // record sample for batch processing
        LinkStatsByDirection* linkStatsByDirection =
            &linkHealthStats_[*nodeKeyInfo->topologyName_ref()]
                             [*nodeKeyInfo->linkName_ref()];
        LinkStatsByTime* linkStats;
        if (*nodeKeyInfo->linkDirection_ref() == thrift::LinkDirection::LINK_A) {
          linkStats = &linkStatsByDirection->linkA;
        } else {
          linkStats = &linkStatsByDirection->linkZ;
        }
        if (*nodeKeyInfo->shortName_ref() == "fw_uptime") {
          (*linkStats)[stat.timestamp].fwUptime = stat.value;
        } else if (*nodeKeyInfo->shortName_ref() == "link_avail") {
          (*linkStats)[stat.timestamp].linkAvail = stat.value;
        }
      }
    }
    time_t nowInMs = StatsUtils::getTimeInMs();
    if ((lastRun + FLAGS_health_process_delay * 1000) < nowInMs) {
      // run batching
      linkHealthUpdater();
      // publish link availability
      publishLinkAvailability();
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
      LinkStatsByDirection& linkStats = linkPair.second;
      // TODO - use both sides of the link for health
      if (!linkStats.linkA.empty()) {
        folly::Optional<thrift::EventDescription> lastEvent;
        // find the last event from DB
        auto linkNameIt = linkState->find(linkName);
        if (linkNameIt != linkState->end()) {
          auto linkDirIt =
              linkNameIt->second.find(thrift::LinkDirection::LINK_A);
          if (linkDirIt != linkNameIt->second.end()) {
            lastEvent = linkDirIt->second;
          }
        }
        auto eventList =
            NetworkHealthUtils::processLinkStats(lastEvent, linkStats.linkA);
        if (lastEvent) {
          LOG(INFO) << "Last event: " << lastEvent->dbId;
        } else {
          LOG(INFO) << "No last event.";
        }
        LOG(INFO) << "Event list for " << linkName;
        for (const auto& linkEvent : eventList) {
          LOG(INFO) << "\tEvent: " << linkEvent.startTime << " <-> "
                    << linkEvent.endTime << " | "
                    << thrift::_LinkStateType_VALUES_TO_NAMES.at(linkEvent.linkState);
        }
        NetworkHealthUtils::updateLinkEventRecords(
            topologyName, linkName, thrift::LinkDirection::LINK_A, eventList);
      }
    }
  }
}

void NetworkHealthService::publishLinkAvailability() {
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();
  if (topologyList.empty()) {
    VLOG(3) << "No topologies found.";
    return;
  }
  std::vector<Metric> metricList{};
  auto mysqlInstance = MySqlClient::getInstance();
  for (const auto& topology : topologyList) {
    const auto allLinkEvents = mysqlInstance->getLinkEvents(
        topology.first,
        FLAGS_link_availability_query_window_h,
        FLAGS_link_availability_allowed_data_delay_s);
    const auto& e2eTopology = topology.second->get_topology();
    double networkAvailability = 0;
    int numValidLinks = 0;
    for (const auto& link : e2eTopology->links) {
      if (link.link_type != thrift::LinkType::WIRELESS ||
          link.a_node_mac.empty() || link.z_node_mac.empty()) {
        continue;
      }
      const auto& linkEvents = allLinkEvents->events.find(link.name);
      if (linkEvents == allLinkEvents->events.end()) {
        continue;
      }
      VLOG(3) << "Link avail: " << linkEvents->second.linkAlive
              << ", linkAvail: " << linkEvents->second.linkAvailForData
              << ", events(size): " << linkEvents->second.events.size();
      std::vector<std::string> prometheusLabels{
          folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_NETWORK,
              topology.first),
          folly::sformat(
              PrometheusConsts::METRIC_FORMAT,
              PrometheusConsts::LABEL_LINK_NAME,
              link.name)
          // no link direction for availability (we use A side)
      };
      metricList.emplace_back(Metric(
          PrometheusUtils::formatPrometheusMetricName("link.availability"),
          allLinkEvents->endTime * 1000,
          prometheusLabels,
          (double)linkEvents->second.linkAvailForData));
    }
  }
  if (metricList.empty()) {
    return;
  }
  bool metricsEnqueued =
      PrometheusUtils::enqueueMetrics("link_availability", metricList);
  if (!metricsEnqueued) {
    LOG(ERROR) << "Failed to enqueue availability metrics.";
  } else {
    VLOG(2) << "Enqueued " << metricList.size() << " metrics to prometheus.";
  }
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
