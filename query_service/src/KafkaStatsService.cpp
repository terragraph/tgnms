/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "KafkaStatsService.h"
#include "MetricCache.h"
#include "PrometheusUtils.h"
#include "StatsUtils.h"

#include "consts/PrometheusConsts.h"

#include <cppkafka/configuration.h>
#include <cppkafka/consumer.h>
#include <cppkafka/producer.h>
#include <folly/String.h>
#include <folly/ThreadName.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

DEFINE_string(
    kafka_group_id,
    "qs_node_stats_reader",
    "Kafka consumer group id");
DEFINE_int32(
    prometheus_batch_interval_ms,
    1000,
    "Prometheus data-point batching interval");
DEFINE_string(
    kafka_link_stats_topic,
    "link_stats",
    "Link statistics topic to produce to");

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

KafkaStatsService::KafkaStatsService(
    const std::string& brokerEndpointList,
    const std::string& statsTopic,
    const int intervalSec,
    const int consumerId)
    : brokerEndpointList_(brokerEndpointList),
      intervalSec_(intervalSec),
      consumerId_(consumerId) {
  workerThread_ = std::thread([this, &statsTopic, &consumerId]() {
    folly::setThreadName("Kafka Stats Service " + consumerId_);
    this->start(statsTopic);
  });
}

KafkaStatsService::~KafkaStatsService() {
  workerThread_.join();
}

folly::Optional<terragraph::thrift::AggrStat>
KafkaStatsService::getFriendlyMetric(const terragraph::thrift::AggrStat& stat) {
  auto metricCacheInstance = MetricCache::getInstance();
  std::string macAddr = stat.entity;
  std::transform(macAddr.begin(), macAddr.end(), macAddr.begin(), ::tolower);
  std::string keyName = stat.key;
  std::transform(keyName.begin(), keyName.end(), keyName.begin(), ::tolower);
  // lookup meta-data for node
  auto nodeKeyInfo = metricCacheInstance->getKeyDataByNodeKey(macAddr, keyName);
  if (!nodeKeyInfo || nodeKeyInfo->shortName.empty()) {
    return folly::none;
  }
  // make a copy of the stat with the short name as the key
  terragraph::thrift::AggrStat shortNameStat(stat);
  shortNameStat.key = nodeKeyInfo->shortName;
  return shortNameStat;
}

// read line (string)
// deserialize to thrift struct
// lookup mac, map to topology/site/node/link
// add to prometheus queue
void KafkaStatsService::start(const std::string& topicName) {
  // Kafka configuration for all topics
  cppkafka::Configuration kafkaConfig = {
      {"metadata.broker.list", brokerEndpointList_},
      {"group.id", FLAGS_kafka_group_id},
      {"auto.commit.interval.ms", 5000},
      {"enable.auto.commit", true},
  };
  folly::Optional<cppkafka::TopicPartitionList> assignedPartitionList = nullptr;
  cppkafka::Consumer kafkaConsumer(kafkaConfig);
  kafkaConsumer.set_assignment_callback(
      [&](const cppkafka::TopicPartitionList& partitions) {
        LOG(INFO) << "[" << consumerId_ << "] Partition assignment updated "
                  << partitions;
        assignedPartitionList = partitions;
      });
  // Print the revoked partitions on revocation
  kafkaConsumer.set_revocation_callback(
      [&](const cppkafka::TopicPartitionList& partitions) {
        LOG(INFO) << "[" << consumerId_ << "] Partition assignment revoked "
                  << partitions;
        assignedPartitionList = partitions;
      });
  try {
    kafkaConsumer.subscribe({topicName});
  } catch (const std::exception& ex) {
    LOG(ERROR) << "[" << consumerId_ << "] Subscribe error: " << ex.what();
    return;
  }
  cppkafka::Producer linkStatsProducer(kafkaConfig);
  cppkafka::MessageBuilder linkStatsBuilder(FLAGS_kafka_link_stats_topic);
  // Now read lines and write them into kafka
  bool isRunning = true;
  std::chrono::milliseconds timeoutMs(1000);
  auto prometheusInstance = PrometheusUtils::getInstance();
  // queue stats for Prometheus lookup
  std::vector<terragraph::thrift::AggrStat> statQueue;
  time_t lastRun = StatsUtils::getTimeInMs();
  while (isRunning) {
    if (prometheusInstance->isQueueFull(intervalSec_)) {
      // wait 1 second before retrying if the prometheus queue is full
      LOG(INFO) << "[" << consumerId_ << "] Prometheus queue full, waiting..";
      std::this_thread::sleep_for(std::chrono::seconds(1));
      continue;
    }
    // poll for new messages
    try {
      cppkafka::Message msg = kafkaConsumer.poll(timeoutMs /* 1 second */);
      if (msg) {
        if (msg.get_error()) {
          // Ignore EOF notifications from rdkafka
          if (!msg.is_eof()) {
            LOG(ERROR) << "[" << consumerId_
                       << "] Received error notification: " << msg.get_error();
          }
        } else {
          const std::string statMsg = msg.get_payload();
          if (assignedPartitionList.hasValue()) {
            VLOG(3) << "[" << consumerId_ << "] Topic: " << topicName
                    << ", group: " << *assignedPartitionList
                    << ", msg: " << statMsg;
          } else {
            VLOG(3) << "[" << consumerId_ << "] Topic: " << topicName
                    << ", msg: " << statMsg;
          }
          // Decode JSON and add to Prometheus queue
          auto stat =
              SimpleJSONSerializer::deserialize<terragraph::thrift::AggrStat>(
                  statMsg);
          statQueue.push_back(stat);
          // generate a new stat for the link stats pipeline if a friendly/short
          // name exists for this metric
          auto friendlyMetric = getFriendlyMetric(stat);
          if (friendlyMetric) {
            VLOG(2) << "Adding friendly metric: " << friendlyMetric->key
                    << ", key: " << stat.key
                    << ", ts: " << friendlyMetric->timestamp;
            statQueue.push_back(*friendlyMetric);
            // produce message back to link stats topic
            std::string friendlyMetricStr =
                SimpleJSONSerializer::serialize<std::string>(*friendlyMetric);
            linkStatsBuilder.payload(friendlyMetricStr);
            linkStatsProducer.produce(linkStatsBuilder);
          }
        }
      }
    } catch (const cppkafka::HandleException& ex) {
      LOG(ERROR) << "Kafka error: " << ex.what();
    } catch (const std::exception& ex) {
      LOG(ERROR) << "Unknown error: " << ex.what();
    }
    time_t batchTimeElapsed = StatsUtils::getTimeInMs() - lastRun;
    // update last time batch ran
    // TODO - elapsed should only be since we first had a metric in the
    // queue - not while waiting, otherwise this looks like we spent a long
    // time waiting
    if (!statQueue.empty() &&
        batchTimeElapsed >= FLAGS_prometheus_batch_interval_ms) {
      LOG(INFO) << "[" << consumerId_ << "] Running prometheus push with "
                << statQueue.size() << " metrics, elapsed: " << batchTimeElapsed
                << ", delay: "
                << (StatsUtils::getDurationString(
                       lastRun / 1000 - statQueue.front().timestamp));
      prometheusInstance->writeNodeStats(intervalSec_, statQueue);
      statQueue.clear();
      lastRun = StatsUtils::getTimeInMs();
    }
  }
}

} // namespace gorilla
} // namespace facebook
