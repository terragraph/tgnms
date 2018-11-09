/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "BeringeiReader.h"

#include "BeringeiClientStore.h"
#include "EventProcessor.h"

#include <algorithm>
#include <array>
#include <math.h>
#include <utility>

#include <folly/DynamicConverter.h>
#include <folly/io/IOBuf.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

using apache::thrift::SimpleJSONSerializer;
using std::chrono::duration_cast;
using std::chrono::milliseconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

const static int GENERATED_KEY_START_INDEX = 9999999;

BeringeiReader::BeringeiReader(
    TACacheMap& typeaheadCache,
    stats::QueryRequest& request)
    : genKeyIndex_(GENERATED_KEY_START_INDEX),
      typeaheadCache_(typeaheadCache),
      request_(request) {}

int64_t BeringeiReader::getTimeInMs() {
  return (int64_t)duration_cast<milliseconds>(
             system_clock::now().time_since_epoch())
      .count();
}

std::string
BeringeiReader::getTimeStr(time_t timeSec) {
  char timeStr[100];
  std::strftime(timeStr, sizeof(timeStr), "%T", std::localtime(&timeSec));
  return std::string(timeStr);
}

folly::dynamic BeringeiReader::process() {
  output_ = folly::dynamic::object;
  auto startTime = getTimeInMs();
  loadKeyMetaData();
  auto keyDataTime = getTimeInMs();
  if (!setTimeWindow()) {
    output_["error"] = "Invalid time window";
    return output_;
  }
  auto validateTime = getTimeInMs();
  if (!validateQuery()) {
    return output_;
  }
  auto timeWindowTime = getTimeInMs();
  fetchBeringeiData();
  auto fetchDataTime = getTimeInMs();
  graphAggregation();
  auto graphAggTime = getTimeInMs();
  limitResults();
  auto limitResultsTime = getTimeInMs();
  limitDataPoints();
  auto limitDataPointsTime = getTimeInMs();
  formatData();
  auto formatDataTime = getTimeInMs();
  cleanUp();
  auto cleanupTime = getTimeInMs();
  LOG(INFO) << "Finished processing. "
            << "Key lookup: " << (keyDataTime - startTime)
            << "ms, validate: " << (validateTime - keyDataTime)
            << "ms, time window: " << (timeWindowTime - validateTime)
            << "ms, data fetch: " << (fetchDataTime - timeWindowTime)
            << "ms, graph agg: " << (graphAggTime - fetchDataTime)
            << "ms, limit results: " << (limitResultsTime - graphAggTime)
            << "ms, limit data points: "
            << (limitDataPointsTime - limitResultsTime)
            << "ms, format data: " << (formatDataTime - limitDataPointsTime)
            << "ms, cleanup: " << (cleanupTime - formatDataTime)
            << "ms, total: " << (cleanupTime - startTime) << "ms";
  return output_;
}

bool BeringeiReader::validateQuery() {
  if (request_.aggregation == stats::GraphAggregation::LATEST) {
    if (request_.outputFormat != stats::StatsOutputFormat::RAW &&
        request_.outputFormat != stats::StatsOutputFormat::RAW_LINK &&
        request_.outputFormat != stats::StatsOutputFormat::RAW_NODE) {
      output_["error"] = "LATEST type only supports RAW output format";
      return false;
    }
  }
  return true;
}

void BeringeiReader::loadKeyMetaData() {
  {
    auto locked = typeaheadCache_.rlock();
    auto taCacheIt = locked->find(request_.topologyName);
    if (taCacheIt == locked->cend()) {
      LOG(INFO) << "\tTopology cache not found: " << request_.topologyName;
      return;
    }
    auto taCache = taCacheIt->second;
    for (const auto& keyName : request_.keyNames) {
      if (request_.debugLogToConsole) {
        LOG(INFO) << "\tFetching metric: " << keyName;
      }
      // fetch KeyData
      auto keyDataList = taCache->getKeyData(keyName);
      for (auto& keyData : keyDataList) {
        bool skipKey = false;
        for (const auto& restrictor : request_.restrictors) {
          std::unordered_set<std::string> restrictorList(
              restrictor.values.begin(), restrictor.values.end());
          if (restrictor.restrictorType == stats::RestrictorType::NODE &&
              !restrictorList.count(keyData.srcNodeName) && !restrictorList.count(keyData.srcNodeMac)) {
            if (request_.debugLogToConsole) {
              LOG(INFO) << "\t\tSkipping node: " << keyData.srcNodeName;
            }
            skipKey = true;
            break;
          }
          if (restrictor.restrictorType == stats::RestrictorType::LINK &&
              !restrictorList.count(keyData.linkName)) {
            if (request_.debugLogToConsole) {
              LOG(INFO) << "\t\tSkipping link: " << keyData.linkName;
            }
            skipKey = true;
            break;
          }
        }
        if (skipKey) {
          continue;
        }
        if (request_.debugLogToConsole) {
          LOG(INFO) << "\t\tMAC: " << keyData.srcNodeMac
                    << ", name: " << keyData.srcNodeName
                    << ", keyName: " << keyData.keyName
                    << ", keyId: " << keyData.keyId;
        }
        keyDataList_.emplace(std::to_string(keyData.keyId), keyData);
      }
    }
  }
}

bool BeringeiReader::setTimeWindow() {
  timeInterval_ = request_.dsIntervalSec;
  if (request_.__isset.minAgo) {
    endTime_ = std::time(nullptr);
    startTime_ = endTime_ - (60 * request_.minAgo);
  } else if (request_.startTsSec != 0 && request_.endTsSec != 0) {
    startTime_ =
        std::ceil(request_.startTsSec / (double)timeInterval_) * timeInterval_;
    endTime_ =
        std::ceil(request_.endTsSec / (double)timeInterval_) * timeInterval_;
    if (endTime_ <= startTime_) {
      LOG(ERROR) << "Request for invalid time window: " << startTime_ << " <-> "
                 << endTime_;
      return false;
    }
  } else {
    // default to 1 day here
    startTime_ = std::time(nullptr) - (24 * 60 * 60);
    endTime_ = std::time(nullptr);
  }
  numDataPoints_ = std::ceil((endTime_ - startTime_) / (double)timeInterval_) + 1;
  LOG(INFO) << "Request for start: " << startTime_ << " <-> " << endTime_
            << ", minutes: " << ((endTime_ - startTime_) / 60)
            << ", interval: " << timeInterval_
            << ", data points: " << numDataPoints_;
  return true;
}

void BeringeiReader::fetchBeringeiData() {
  folly::EventBase eb;
  gorilla::GetDataRequest beringeiRequest;

  beringeiRequest.beginTimestamp = startTime_;
  beringeiRequest.endTimestamp = endTime_;

  for (const auto& keyId : keyDataList_) {
    gorilla::Key beringeiKey;
    beringeiKey.key = keyId.first;
    // everything is shard 0 on the writer side
    beringeiKey.shardId = 0;
    beringeiRequest.keys.push_back(beringeiKey);
  }
  // This thread is running inside a proxygen EventBase, which conflicts
  // with the beringei client trying to run inside the same.
  // Use a new EventBase for the request
  eb.runInLoop([this, &beringeiRequest]() mutable {
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getReadClient(timeInterval_);
    int numShards = beringeiClient->getNumShards();
    beringeiClient->get(beringeiRequest, beringeiTimeSeries_);
  });
  std::thread tEb([&eb]() { eb.loop(); });
  tEb.join();
  // place the results in buckets
  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    const std::string& keyId = keyTimeSeries.first.key;
    // keyIndex = keyMapIndex[keyName];
    const auto& keyMetaData = keyDataList_.at(keyId);
    if (request_.debugLogToConsole) {
      LOG(INFO) << "Key id: " << keyId << ", name: " << keyMetaData.keyName;
    }
    double* beringeiData = new double[numDataPoints_]{};
    // default initialize data to NaN
    std::fill_n(beringeiData, numDataPoints_, std::nan(""));
    for (const auto& timePair : keyTimeSeries.second) {
      if (request_.debugLogToConsole) {
        LOG(INFO) << "\t" << timePair.unixTime << " = " << timePair.value;
      }
      int timeBucketId = (timePair.unixTime - startTime_) / timeInterval_;
      if (numDataPoints_ <= timeBucketId) {
        LOG(INFO) << "Start time: " << startTime_
                  << ", end time: " << endTime_
                  << ", timeInterval_: " << timeInterval_
                  << ", num data points: " << numDataPoints_
                  << ", time bucket id: " << timeBucketId;
      }
      assert(numDataPoints_ > timeBucketId);
      // add data point
      beringeiData[timeBucketId] = timePair.value;
    }
    keyTimeSeries_.emplace(keyId, beringeiData);
  }
}

// apply graph aggregation (NONE, SUM, TOP_AVG)
void BeringeiReader::graphAggregation() {
  switch (request_.aggregation) {
    case stats::GraphAggregation::NONE:
      break;
    case stats::GraphAggregation::AVG:
      // average across all data points
      graphAggregationAvg();
      break;
    case stats::GraphAggregation::COUNT:
      // count # of data points per ts
      graphAggregationCount();
      break;
    case stats::GraphAggregation::SUM:
      graphAggregationSum();
      break;
    case stats::GraphAggregation::TOP_AVG:
      break;
    case stats::GraphAggregation::BOTTOM_AVG:
      break;
    case stats::GraphAggregation::LATEST:
      graphAggregationLatest();
      break;
    case stats::GraphAggregation::LINK_STATS:
      graphAggregationStats();
      break;
    default:
      LOG(ERROR) << "No supported graph aggregation: "
                 << (int)request_.aggregation;
  }
}

void BeringeiReader::graphAggregationSum() {
  double* sumPerInterval = new double[numDataPoints_]{};
  for (const auto& timeSeries : keyTimeSeries_) {
    for (int i = 0; i < numDataPoints_; i++) {
      if (!std::isnan(timeSeries.second[i])) {
        sumPerInterval[i] += timeSeries.second[i];
      }
    }
  }
  ASSERT(aggregateKeyTimeSeries_.emplace("Sum", sumPerInterval).second);
}

void BeringeiReader::graphAggregationAvg() {
  double* sumPerInterval = new double[numDataPoints_]{};
  int* countPerInterval = new int[numDataPoints_]{};
  double* avgPerInterval = new double[numDataPoints_]{};
  double* minPerInterval = new double[numDataPoints_]{};
  std::fill_n(minPerInterval, numDataPoints_, std::nan(""));
  double* maxPerInterval = new double[numDataPoints_]{};
  std::fill_n(maxPerInterval, numDataPoints_, std::nan(""));
  for (const auto& timeSeries : keyTimeSeries_) {
    for (int i = 0; i < numDataPoints_; i++) {
      if (!std::isnan(timeSeries.second[i])) {
        sumPerInterval[i] += timeSeries.second[i];
        countPerInterval[i]++;
        if (std::isnan(minPerInterval[i])) {
          // use first data point for the interval
          minPerInterval[i] = timeSeries.second[i];
        } else {
          minPerInterval[i] = std::min(minPerInterval[i], timeSeries.second[i]);
        }
        if (std::isnan(maxPerInterval[i])) {
          // use first data point for the interval
          maxPerInterval[i] = timeSeries.second[i];
        } else {
          maxPerInterval[i] = std::max(maxPerInterval[i], timeSeries.second[i]);
        }
      }
    }
  }
  for (int i = 0; i < numDataPoints_; i++) {
    if (countPerInterval[i] == 0) {
      avgPerInterval[i] = std::nan("");
    } else {
      avgPerInterval[i] = sumPerInterval[i] / countPerInterval[i];
    }
  }
  delete[] sumPerInterval;
  delete[] countPerInterval;
  ASSERT(aggregateKeyTimeSeries_.emplace("Average", avgPerInterval).second);
  ASSERT(aggregateKeyTimeSeries_.emplace("Min", minPerInterval).second);
  ASSERT(aggregateKeyTimeSeries_.emplace("Max", maxPerInterval).second);
}

void BeringeiReader::graphAggregationCount() {
  double* countPerInterval = new double[numDataPoints_]{};
  for (const auto& timeSeries : keyTimeSeries_) {
    for (int i = 0; i < numDataPoints_; i++) {
      if (!std::isnan(timeSeries.second[i])) {
        countPerInterval[i]++;
      }
    }
  }
  ASSERT(aggregateKeyTimeSeries_.emplace("Count", countPerInterval).second);
}

void BeringeiReader::graphAggregationLatest() {
  for (const auto& timeSeries : keyTimeSeries_) {
    // find the latest data point
    for (int i = numDataPoints_ - 1; i >= 0; i--) {
      if (!std::isnan(timeSeries.second[i])) {
        valuePerKey_.emplace(timeSeries.first, timeSeries.second[i]);
        break;
      }
    }
  }
}

void BeringeiReader::graphAggregationStats() {
  // keep track of packet/bytes counters to calculate PER
  std::unordered_map<std::string /* link name */,
      std::unordered_map<stats::LinkDirection,
          std::unordered_map<std::string /* short name */,
              double*>>> linkMetricsCache{};
  // per-key interval status (up/down)
  std::unordered_map<std::string, int*> linkIntervalStatusMap{};
  // ensure we have all of the data we need requested
  for (const auto& timeSeries : keyTimeSeries_) {
    auto& keyMetaData = keyDataList_[timeSeries.first];
    // give the computed key for each requested metric
    std::unordered_set<std::string> avgMetricsList = {
      "snr",
      "mcs",
      "tx_power"};
    if (avgMetricsList.count(keyMetaData.shortName)) {
      int count = 0;
      double sum = 0;
      for (int i = 0; i < numDataPoints_; i++) {
        if (!std::isnan(timeSeries.second[i])) {
          sum += timeSeries.second[i];
          count++;
        }
      }
      double avg = count > 0 ? (sum / count) : 0;
      createLinkKey(
        folly::sformat("avg_{}", keyMetaData.shortName), avg, keyMetaData);
    } else if (keyMetaData.shortName == "fw_uptime") {
      int* intervalStatus = EventProcessor::computeIntervalStatus(
        timeSeries.second,
        startTime_,
        endTime_,
        numDataPoints_,
        timeInterval_,
        request_.countPerSecond
      );
      // use link name when recording stat, so we can match a/z side
      const std::string& linkName = keyMetaData.linkName;
      if (linkIntervalStatusMap.count(linkName)) {
        // resolve differences in link uptime reported from A/Z
        if (request_.debugLogToConsole) {
          LOG(INFO) << "Resolving link differences for "
                    << linkName;
        }
        // resolve link differences
        resolveLinkUptimeDifferences(linkIntervalStatusMap[linkName] /* dest */, intervalStatus);
        // delete the current allocation
        delete[] intervalStatus;
        // swap our focus to the merged link data
        intervalStatus = linkIntervalStatusMap.at(linkName);
      } else {
        // first side reporting
        linkIntervalStatusMap[linkName] = intervalStatus;
      }

    } else if (keyMetaData.shortName == "tx_fail" ||
               keyMetaData.shortName == "tx_ok") {
      // value needs correlation, store in cache
      linkMetricsCache[keyMetaData.linkName]
                      [keyMetaData.linkDirection]
                      [keyMetaData.shortName] = timeSeries.second;
    }
  }
  // process events after a/z sides of link have been compared
  for (const auto& linkIntervalStatus : linkIntervalStatusMap) {
    auto intervalEventList = EventProcessor::formatIntervalStatus(
      linkIntervalStatus.second,
      startTime_,
      endTime_,
      numDataPoints_,
      timeInterval_
    );
    // free the int* intervalStatus memory
    delete[] linkIntervalStatus.second;
    // create metrics on side 'A', the UI will show 'A'  for both sides
    createLinkKey("uptime",
                  intervalEventList.alive,
                  linkIntervalStatus.first,
                  stats::LinkDirection::LINK_A);
    int flaps = !intervalEventList.events.empty() ?
        intervalEventList.events.size() - 1 :
        0;
    createLinkKey("flaps",
                  flaps,
                  linkIntervalStatus.first,
                  stats::LinkDirection::LINK_A);
  }
  // calculate metrics that require multiple sources
  for (const auto& linkNameMap : linkMetricsCache) {
    for (const auto& linkDirectionMap : linkNameMap.second) {
      // if tx_ok && tx_fail exist, calculate per
      auto txOkIt = linkDirectionMap.second.find("tx_ok");
      auto txFailIt = linkDirectionMap.second.find("tx_fail");
      if (txOkIt != linkDirectionMap.second.end() &&
          txFailIt != linkDirectionMap.second.end()) {
        double* txFail = txFailIt->second;
        double* txOk = txOkIt->second;
        // record sum of all valid data points
        double sumTxOk = 0;
        double sumTxFail = 0;
        // last real values for both metrics
        double lastTxOk = 0;
        double lastTxFail = 0;
        // loop over all counter data points
        // if counter rolls back - drop the interval (link reset)
        for (int i = 0; i < numDataPoints_; i++) {
          if (!std::isnan(txOk[i]) && !std::isnan(txFail[i])) {
            // if currentValue > lastValue, add difference
            if (txOk[i] >= lastTxOk && txFail[i] >= lastTxFail) {
              sumTxOk += (txOk[i] - lastTxOk);
              sumTxFail += (txFail[i] - lastTxFail);
            }
            lastTxOk = txOk[i];
            lastTxFail = txFail[i];
          }
        }
        double avgPer = sumTxFail > 0 ?
          (sumTxFail / (sumTxOk + sumTxFail) * 100.0) : 0;
        double avgTputPps = (sumTxOk + sumTxFail) / (endTime_ - startTime_);
        createLinkKey("avg_per",
                      avgPer,
                      linkNameMap.first,
                      linkDirectionMap.first);
        createLinkKey("avg_tput",
                      avgTputPps,
                      linkNameMap.first,
                      linkDirectionMap.first);
      }
    }
  }
}

// apply max results
void BeringeiReader::limitResults() {
  // if per-key values exist, use them as-is
  if (!valuePerKey_.empty()) {
    return;
  }
  // limit without caring about order
  if (!aggregateKeyTimeSeries_.empty() ||
      (request_.maxResults == 0 ||
       keyTimeSeries_.size() <= request_.maxResults)) {
    return;
  }
  LOG(INFO) << "Limiting results from " << keyTimeSeries_.size() << " to "
            << request_.maxResults;
  while (keyTimeSeries_.size() > request_.maxResults) {
    // remove entries from KeyMetaData map and free memory as we remove
    auto it = keyTimeSeries_.begin();
    ASSERT(keyDataList_.erase(it->first) == 1);
    delete[] it->second;
    keyTimeSeries_.erase(it);
  }
}

// apply max data points/avg
void BeringeiReader::limitDataPoints() {
  // use value per-key as-is
  if (!valuePerKey_.empty()) {
    return;
  }
  // requested data points fewer than max, or no limit requested
  if (numDataPoints_ <= request_.maxDataPoints || request_.maxDataPoints == 0) {
    return;
  }
  int dataPointsPerInterval =
      std::ceil((double)numDataPoints_ / request_.maxDataPoints);
  int totalAggDataPoints = numDataPoints_ / dataPointsPerInterval;
  if (request_.debugLogToConsole) {
    LOG(INFO) << "Total: " << totalAggDataPoints
              << ", num dp: " << numDataPoints_
              << ", per-interval: " << dataPointsPerInterval;
  }
  std::unordered_map<std::string, double*> *keyTimeSeries = &keyTimeSeries_;
  if (!aggregateKeyTimeSeries_.empty()) {
    keyTimeSeries = &aggregateKeyTimeSeries_;
  }
  for (const auto& timeSeries : *keyTimeSeries) {
    for (int aggPointIdx = 0; aggPointIdx < totalAggDataPoints; aggPointIdx++) {
      int startPoint = aggPointIdx * dataPointsPerInterval;
      int endPoint = (aggPointIdx + 1) * dataPointsPerInterval;
      // add all data-points for last aggregated point
      if (aggPointIdx == (totalAggDataPoints - 1)) {
        endPoint = numDataPoints_ - 1;
      }
      if (request_.debugLogToConsole) {
        LOG(INFO) << "\tCondensing " << aggPointIdx << "(" << startPoint
                  << "<->" << endPoint << ")";
      }
      int validDps = 0;
      double sumDps = 0;
      for (int rawIdx = startPoint; rawIdx < endPoint; rawIdx++) {
        if (!std::isnan(timeSeries.second[rawIdx])) {
          sumDps += timeSeries.second[rawIdx];
          validDps++;
        }
      }
      if (validDps) {
        // over-write dps
        timeSeries.second[aggPointIdx] = sumDps / validDps;
      } else {
        // no data for aggregated interval, mark as missing
        timeSeries.second[aggPointIdx] = std::nan("");
      }
    }
  }
  // update the expected dp count
  numDataPoints_ = totalAggDataPoints;
}

// format (POINTS, RAW, ...)
void BeringeiReader::formatData() {
  folly::dynamic dpList = folly::dynamic::array;
  // dpList is an array of (time, v1, v2 .... v(N)) where time is the Unix
  // timestamp in ms and N is the number of expected time series points
  // If the value if missing from the DB, v(n) = nullptr
  folly::dynamic columnNames = folly::dynamic::array;
  columnNames.push_back("time");
  // dynamically decide which map to iterate
  std::unordered_map<std::string, double*> *keyTimeSeries = &keyTimeSeries_;
  switch (request_.outputFormat) {
    case stats::StatsOutputFormat::POINTS:
      // use columns
      if (!aggregateKeyTimeSeries_.empty()) {
        keyTimeSeries = &aggregateKeyTimeSeries_;
      }
      for (int i = 0; i < numDataPoints_; i++) {
        folly::dynamic tsList = folly::dynamic::array;
        // timestamp in ms (javascript Date format)
        double timestamp = (long)((startTime_ + (endTime_ - startTime_) *
                           ((double)i / numDataPoints_)) * 1000);
        tsList.push_back(timestamp);
        dpList.push_back(tsList);
      }
      for (const auto& timeSeries : *keyTimeSeries) {
        for (int i = 0; i < numDataPoints_; i++) {
          if (std::isnan(timeSeries.second[i])) {
            dpList[i].push_back(nullptr);
          } else {
            dpList[i].push_back(timeSeries.second[i]);
          }
        }
        if (aggregateKeyTimeSeries_.empty()) {
          auto& keyMetaData = keyDataList_[timeSeries.first];
          // use "<node name> / <key name>" by default
          auto keyName = folly::sformat(
              "{} / {}", keyMetaData.srcNodeName, keyMetaData.keyName);
          if (!keyMetaData.linkName.empty()) {
            // attempt to use link name + direction if link name set
            keyName = folly::sformat("{} ({})",
              keyMetaData.linkName,
              keyMetaData.linkDirection == stats::LinkDirection::LINK_A ?
                "A" : "Z");
          }
          columnNames.push_back(keyName);
        } else {
          auto keyName = timeSeries.first;
          std::replace(keyName.begin(), keyName.end(), '.', ' ');
          columnNames.push_back(keyName);
        }
      }
      output_["points"] = dpList;
      output_["columns"] = columnNames;
      break;
    case stats::StatsOutputFormat::TABLE:
      break;
    case stats::StatsOutputFormat::RAW_LINK:
      if (!valuePerKey_.empty()) {
        // add meta data to each key id
        for (const auto& keyValue : valuePerKey_) {
          // ensure key meta-data exists
          auto metaDataIt = keyDataList_.find(keyValue.first);
          assert(metaDataIt != keyDataList_.end());
          auto& keyMeta = metaDataIt->second;
          if (keyMeta.linkName.empty()) {
            LOG(ERROR) << "RAW_LINK selected on non-link metric.";
            continue;
          }
          if (!output_.count(keyMeta.linkName)) {
            output_[keyMeta.linkName] = folly::dynamic::object();
          }
          std::string linkDirection =
              keyMeta.linkDirection == stats::LinkDirection::LINK_A ? "A" : "Z";
          if (!output_[keyMeta.linkName].count(linkDirection)) {
            output_[keyMeta.linkName][linkDirection] = folly::dynamic::object();
          }
          if (!keyMeta.keyName.empty()) {
            output_[keyMeta.linkName][linkDirection][keyMeta.keyName] =
                keyValue.second;
          }
          // add short name if set
          if (!keyMeta.shortName.empty()) {
            output_[keyMeta.linkName][linkDirection][keyMeta.shortName] =
                keyValue.second;
          }
        }
      }
      break;
    case stats::StatsOutputFormat::RAW_NODE:
      if (!valuePerKey_.empty()) {
        // add meta data to each key id
        for (const auto& keyValue : valuePerKey_) {
          // ensure key meta-data exists
          auto metaDataIt = keyDataList_.find(keyValue.first);
          assert(metaDataIt != keyDataList_.end());
          auto& keyMeta = metaDataIt->second;
          if (!output_.count(keyMeta.srcNodeName)) {
            output_[keyMeta.srcNodeName] = folly::dynamic::object();
          }
          output_[keyMeta.srcNodeName][keyMeta.keyName] = keyValue.second;
          // add short name if set
          if (!keyMeta.shortName.empty()) {
            output_[keyMeta.srcNodeName][keyMeta.shortName] = keyValue.second;
          }
        }
      }
      break;
    case stats::StatsOutputFormat::RAW:
      if (!aggregateKeyTimeSeries_.empty()) {
        keyTimeSeries = &aggregateKeyTimeSeries_;
      }
      for (const auto& timeSeries : *keyTimeSeries) {
        folly::dynamic dpList = folly::dynamic::array;
        for (int i = 0; i < numDataPoints_; i++) {
          if (std::isnan(timeSeries.second[i])) {
            dpList.push_back(nullptr);
          } else {
            dpList.push_back(timeSeries.second[i]);
          }
        }
        if (aggregateKeyTimeSeries_.empty()) {
          auto& keyMetaData = keyDataList_[timeSeries.first];
          // use "<node name> / <key name>" for now
          auto keyName = folly::sformat(
              "{} / {}", keyMetaData.srcNodeName, keyMetaData.keyName);
          output_[keyName] = dpList;
        } else {
          output_[timeSeries.first] = dpList;
        }
      }
      break;
    case stats::StatsOutputFormat::EVENT_LINK:
      formatDataEvent(true);
      break;
    case stats::StatsOutputFormat::EVENT_NODE:
      formatDataEvent();
      break;
    default:
      LOG(ERROR) << "No supported output format: "
                 << (int)request_.outputFormat;
  }
}

void
BeringeiReader::formatDataEvent(bool isLink) {
  // event processing
  const double expectedStatCounterSlope =
      request_.countPerSecond * timeInterval_;
  std::unordered_map<std::string, int*> intervalStatusMap{};
  for (const auto& timeSeries : keyTimeSeries_) {
    int missingIntervals = 0;
    int* intervalStatus = new int[numDataPoints_]{};
    for (int i = 0; i < numDataPoints_; i++) {
      std::string slopeValue = "";
      if (std::isnan(timeSeries.second[i])) {
        // mark missing interval
        missingIntervals++;
        slopeValue = "MISSING_INTERVAL";
        // special handling of the last 2 data points
        // if missing and previous are up, then assume currently up
        if (i == (numDataPoints_ - 1) && missingIntervals <= 2 &&
            intervalStatus[i - missingIntervals] == 1) {
          slopeValue = "MISSING_FILL_LAST1(" +
                       std::to_string(missingIntervals) + ")";
          std::fill_n(intervalStatus + i - missingIntervals + 1,
                      missingIntervals,
                      1);
        }
      } else {
        // no missing data, either UP or DOWN
        if (missingIntervals == 0) {
          if (timeSeries.second[i] >= expectedStatCounterSlope) {
            // entire interval is online
            intervalStatus[i] = 1;
            slopeValue = "UP_INTERVAL";
          } else {
            slopeValue = "DOWN_INTERVAL";
          }
        } else if (missingIntervals > 0) {
          // missing/NaN data we can assume were up based on the current value
          if (timeSeries.second[i] >=
                ((missingIntervals + 1) * expectedStatCounterSlope)) {
            slopeValue = "UP_FILLED_ALL_MISSING(" +
                         std::to_string(missingIntervals) + ")";
            std::fill_n(intervalStatus + i - missingIntervals,
                        missingIntervals + 1,
                        1);
          } else if (timeSeries.second[i] > 0) {
            int filledIntervals = (timeSeries.second[i] / expectedStatCounterSlope);
            std::fill_n(intervalStatus + i + 1 - filledIntervals,
                        filledIntervals,
                        1);
            // some part of the interval was up, not filling partial for now
            // to keep this simple
            slopeValue = "UP_FILLED_PARTIAL(" +
                         std::to_string(filledIntervals) + ")";
          } else {
            slopeValue = "DOWN_NO_FILL";
          }
        }
        missingIntervals = 0;
      }
      if (request_.debugLogToConsole) {
        LOG(INFO) << "\tTS(" << i << ") = " << timeSeries.second[i]
                  << " [" << slopeValue << "]";
      }
    }
    // key name for reporting stat
    auto& keyMetaData = keyDataList_[timeSeries.first];
    std::string keyName(keyMetaData.srcNodeName);
    if (isLink) {
      keyName = keyMetaData.linkName;
    }
    if (isLink && intervalStatusMap.count(keyName)) {
      // resolve differences in link uptime reported from A/Z
      if (request_.debugLogToConsole) {
        LOG(INFO) << "Resolving link differences for " << keyName;
      }
      // resolve link differences
      resolveLinkUptimeDifferences(intervalStatusMap[keyName] /* dest */, intervalStatus);
      // delete the current allocation
      delete[] intervalStatus;
      // swap our focus to the merged link data
      intervalStatus = intervalStatusMap.at(keyName);
    } else {
      // first side reporting
      intervalStatusMap[keyName] = intervalStatus;
    }
    folly::dynamic eventsArray = folly::dynamic::array;
    int lastChange = 0;
    for (int i = 0; i < numDataPoints_; i++) {
      // log event when state changes (UP/DOWN)
      if (i > 0 && intervalStatus[i] != intervalStatus[i - 1]) {
        // status changed
        if (intervalStatus[i] == 0) {
          // new status is down, add event for the previous uptime
          // start = lastChange, end = i
          int64_t startTime = startTime_ + lastChange * timeInterval_;
          int64_t endTime = startTime_ + (i - 1) * timeInterval_;
          eventsArray.push_back(folly::dynamic::object
            ("startTime", startTime)
            ("endTime", endTime)
            ("title", folly::sformat("{} minutes between {} <-> {}",
                (endTime - startTime) / 60.0,
                getTimeStr(startTime),
                getTimeStr(endTime))));
        }
        lastChange = i;
      }
      // special handling for last data point
      if (i == (numDataPoints_ - 1) && intervalStatus[i] == 1) {
        // last data point is up, record an event
        int64_t startTime = startTime_ + lastChange * timeInterval_;
        int64_t endTime = startTime_ + i * timeInterval_;
        eventsArray.push_back(folly::dynamic::object
          ("startTime", startTime)
          ("endTime", endTime)
          ("title", folly::sformat("{} minutes between {} <-> {}",
              (endTime - startTime) / 60.0,
              getTimeStr(startTime),
              getTimeStr(endTime))));
      }
      if (request_.debugLogToConsole) {
        LOG(INFO) << "[" << i << "]: " << ((intervalStatus[i] == 1) ? "UP" :
                  (intervalStatus[i] == 0 ? "DOWN" : "____ERROR____"));
      }
    }
    // calculate the amount of intervals online
    int onlineIntervals = std::accumulate(&intervalStatus[0],
                                          &intervalStatus[numDataPoints_], 0);
    double alivePerc = onlineIntervals / (double)numDataPoints_ * 100.0;
    output_[keyName] = folly::dynamic::object(
        "alive", alivePerc)("events", eventsArray);
    output_["startTime"] = startTime_;
    output_["endTime"] = endTime_;
    if (request_.debugLogToConsole) {
      LOG(INFO) << "Total uptime: " << onlineIntervals << "/" << numDataPoints_;
    }
  }
  // cleanup
  for (const auto& entry : intervalStatusMap) {
    delete[] entry.second;
  }
}

/**
 * Resolve differences in link uptime from A/Z side.
 *
 * If either side is online for the whole interval, than mark the current as
 * UP (1).
 */
void BeringeiReader::resolveLinkUptimeDifferences(int* dstLink, int* srcLink) {
  for (int i = 0; i < numDataPoints_; i++) {
    if (srcLink[i] == 1 && dstLink[i] == 0) {
      dstLink[i] = 1 /* UP */;
      if (request_.debugLogToConsole) {
        LOG(INFO) << "Link difference on index " << i;
      }
    }
  }
}

void BeringeiReader::cleanUp() {
  // free data points
  for (const auto& timeSeries : keyTimeSeries_) {
    delete[] timeSeries.second;
  }
  keyTimeSeries_.clear();
  for (const auto& timeSeries : aggregateKeyTimeSeries_) {
    delete[] timeSeries.second;
  }
  aggregateKeyTimeSeries_.clear();
}

void BeringeiReader::createLinkKey(const std::string& keyName,
                                   double value,
                                   const std::string& linkName,
                                   const stats::LinkDirection& linkDirection) {
  int64_t keyId = ++genKeyIndex_;
  valuePerKey_.emplace(std::to_string(keyId), value);
  KeyMetaData metaData;
  metaData.keyId = keyId;
  metaData.keyName = keyName;
  metaData.__isset.linkName = true;
  metaData.linkName = linkName;
  metaData.__isset.linkDirection = true;
  metaData.linkDirection = linkDirection;
  keyDataList_.emplace(std::to_string(keyId), metaData);
}

void BeringeiReader::createLinkKey(const std::string& keyName,
                                   double value,
                                   const KeyMetaData& metaDataExisting) {
  createLinkKey(keyName, value, metaDataExisting.linkName, metaDataExisting.linkDirection);
}

} // namespace gorilla
} // namespace facebook
