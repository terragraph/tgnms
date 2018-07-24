/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in
 * the LICENSE file in the root directory of this source tree. An
 * additional grant of patent rights can be found in the PATENTS
 * file in the same directory.
 */

#include "RawReadBeringeiData.h"

#include "BeringeiClientStore.h"

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

RawReadBeringeiData::RawReadBeringeiData(TACacheMap& typeaheadCache)
    : typeaheadCache_(typeaheadCache) {}

RawQueryReturn RawReadBeringeiData::process(
    query::RawReadQueryRequest& rawReadQueryRequest) {
  // Final response to output
  query::RawReadQuery rawReadQuery;
  RawQueryReturn response;
  for (const auto& query : rawReadQueryRequest.queries) {
    rawReadQuery = query;
    RawTimeSeriesList singleQueryResponse;
    singleQueryResponse.timeSeriesAndKeyList.clear();
    if (rawReadQuery.queryKeyList.empty()) {
      response.queryReturnList.push_back(singleQueryResponse);
    } else {
      LOG(INFO) << "Request between start timestamp "
                << rawReadQuery.startTimestamp << " and end timestamp "
                << rawReadQuery.endTimestamp;
      singleQueryResponse = handleQuery(rawReadQuery);
      VLOG(5) << "Return query return of size: "
              << singleQueryResponse.timeSeriesAndKeyList.size();
      response.queryReturnList.push_back(singleQueryResponse);
    }
  }
  return response;
}

// This function takes a list of Beringei Query and send to the Beringei Data
// Base for data. It returns a list of the obtained time series, i.e., the
// query return for a single RawReadQuery.
RawTimeSeriesList RawReadBeringeiData::handleQuery(
    query::RawReadQuery rawReadQuery) {
  auto queryExecuteStartTime = (int64_t)duration_cast<milliseconds>(
                                   system_clock::now().time_since_epoch())
                                   .count();
  // select the data source based on time interval
  LOG(INFO) << "Selected Beringei DB with interval = " << rawReadQuery.interval;

  QueryWindow queryWindow = validateQuery(rawReadQuery);
  if (queryWindow.checkResult != kSuccess) {
    // if not valid, do nothing
    LOG(INFO) << "Invalid query, return empty";
  } else {
    // fetch async data
    VLOG(2) << "Valid query, begin Beringei DB querying";
    folly::EventBase eb;
    eb.runInLoop([this, queryWindow, rawReadQuery]() mutable {
      auto beringeiClientStore = BeringeiClientStore::getInstance();
      auto beringeiClient =
          beringeiClientStore->getReadClient(rawReadQuery.interval);
      int numShards = beringeiClient->getNumShards();
      auto beringeiRequest =
          createBeringeiRequest(rawReadQuery, numShards, queryWindow);
      VLOG(1) << "number of keyId to query: " << beringeiRequest.keys.size();
      beringeiClient->get(beringeiRequest, beringeiTimeSeries_);
      VLOG(1) << "number of retuned result: " << beringeiTimeSeries_.size();
      // TODO: TODO: why there can be no return???? even when the keyid is found
      // TODO: can clear the found keyId passes all to kFail????
      LOG(ERROR) << "number of keyId to query: (" << beringeiRequest.keys.size()
                 << ") != number of retuned result: ("<<   beringeiTimeSeries_.size()
                 <<")";
    });
    std::thread tEb([&eb]() { eb.loop(); });
    tEb.join();
  }

  RawTimeSeriesList results{};
  results = generateRawOutput(rawReadQuery, beringeiTimeSeries_);
  beringeiTimeSeries_.clear();
  auto queryExecuteEndTime = (int64_t)duration_cast<milliseconds>(
                                 system_clock::now().time_since_epoch())
                                 .count();
  LOG(INFO) << "Query completed and takes "
            << queryExecuteEndTime - queryExecuteStartTime << " ms in total.";
  return results;
}

// Validate the query and make the proper time window
// If endTime is not larger than startTime LOG(ERROR) and return
struct QueryWindow RawReadBeringeiData::validateQuery(
    const query::RawReadQuery& request) {
  int timeInterval = request.interval;
  QueryWindow queryWindow;
  if (request.startTimestamp != 0 && request.endTimestamp != 0) {
    time_t startTime =
        std::ceil(request.startTimestamp / (double)timeInterval) * timeInterval;
    time_t endTime =
        std::ceil(request.endTimestamp / (double)timeInterval) * timeInterval;

    if (endTime <= startTime) {
      LOG(ERROR) << "Request for invalid time window: " << startTime
                 << " >= " << endTime;
      queryWindow.checkResult = kFail;
    } else {
      LOG(INFO) << "Request for start time: " << startTime << " <-> " << endTime
                << ", interval: " << timeInterval << " ,and "
                << request.queryKeyList.size() << " keyIds to query";
      queryWindow.startTime = startTime;
      queryWindow.endTime = endTime;
      queryWindow.checkResult = kSuccess;
    }
  } else {
    LOG(ERROR) << "No start time and end time provided";
    queryWindow.checkResult = kFail;
  }
  return queryWindow;
}

// Translate RawReadQuery to GetDataRequest, which is the request data
// structure of Beringei Request
GetDataRequest RawReadBeringeiData::createBeringeiRequest(
    const query::RawReadQuery& request,
    const int numShards,
    QueryWindow queryWindow) {
  GetDataRequest beringeiRequest;

  beringeiRequest.beginTimestamp = queryWindow.startTime;
  beringeiRequest.endTimestamp = queryWindow.endTime;

  successFindKeyId_.clear();
  fullMetricKeyName_.clear();

  for (const auto& rawQueryKey : request.queryKeyList) {
    // If keyId is provided, use keyId
    // If not, find the right keyId from MySQL
    Key beringeiKey;

    // fullMetricKeyName, will be returned for debugging. It is only
    // filled for the requests whose keyId is found by mac address and
    // metricName
    fullMetricKeyName_.push_back("");
    if (rawQueryKey.__isset.keyId) {
      VLOG(4) << "The keyId " << rawQueryKey.keyId
              << " is provided, use it without search in MySQL";
      beringeiKey.key = std::to_string(rawQueryKey.keyId);
      successFindKeyId_.push_back(true);
    } else {
      // Find the right keyId via MySQL
      VLOG(2) << "rawQueryKey info: sourceMac " << rawQueryKey.sourceMac
              << " peerMac " << rawQueryKey.peerMac << " metricName "
              << rawQueryKey.metricName;
      auto keyId = findBeringeiKeyId(rawQueryKey);
      VLOG(1) << "Found KeyId of " << keyId << " from MySQL";
      if (keyId == kFail) {
        // If not found, return empty return for this query. Now just label
        // keyId as kFail
        VLOG(2) << "Cannot found valid KeyId by the provide metric from MySQL";
        successFindKeyId_.push_back(false);
      } else {
        successFindKeyId_.push_back(true);
        beringeiKey.key = std::to_string(keyId);
      }
    }

    // Currently, everything is shard 0 on the writer side
    // TODO: Once shared hash is done, update the shardId to be hash(key)
    beringeiKey.shardId = 0;
    beringeiRequest.keys.push_back(beringeiKey);
    LOG(INFO) << "There are " << beringeiRequest.keys.size()
              << " keyIds to query from Beringei DB";

    for (int i = 0; i < beringeiRequest.keys.size(); i++) {
      VLOG(1) << "The " << i << "-th "
              << " keyId is:" << beringeiRequest.keys[i].key;
    }
  }

  return beringeiRequest;
}

// Store the fetched time series into RawTimeSeriesList without any processing
// Once analytics models is finalized, can move computation hungry or frequent
// reads to here.
RawTimeSeriesList RawReadBeringeiData::generateRawOutput(
    query::RawReadQuery rawReadQuery,
    TimeSeries beringeiTimeseries) {
  LOG(INFO) << "Begin generateRawOutput of " << beringeiTimeseries.size()
            << " series";

  RawTimeSeriesList response;

  int timeSeriesAndKeyListIdx = 0;
  int queryReturnIdx = 0;
  RawTimeSeries perQueryResponse;
  LOG(INFO) << "Before itea";
  for (const auto& successFindKey : successFindKeyId_) {
    LOG(INFO) << "elements:" << successFindKey;}
  for (const auto& metricName : fullMetricKeyName_) {
    LOG(INFO) << "metricName:" << metricName;}
  for (const auto& successFindKey : successFindKeyId_) {
    LOG(INFO) << "iteaing" << successFindKey;
    LOG(INFO) << "index:" << timeSeriesAndKeyListIdx;
    perQueryResponse.timeSeries.clear();
    // Add the founded fullMetricKeyName. For queries using sourceMac, peerMac,
    // and metricName, will have fullMetricKeyName;
    // For queries using keyId, not filled.
    perQueryResponse.fullMetricKeyName =
        fullMetricKeyName_[timeSeriesAndKeyListIdx];
    if (successFindKey) {
      // Load the data if request is valid
      LOG(INFO) << "before doing this";
      std::pair<Key, std::vector<TimeValuePair>> keyTimeSeries =
          beringeiTimeseries[queryReturnIdx];
      LOG(INFO) << "keyTimeSeries.first.key" << keyTimeSeries.first.key;
      LOG(INFO) << "keyTimeSeries.first.shardId" << keyTimeSeries.first.shardId;
      perQueryResponse.beringeiDBKey.key = keyTimeSeries.first.key;
      perQueryResponse.beringeiDBKey.shardId = keyTimeSeries.first.shardId;
      for (const auto& time_value_pair_ : keyTimeSeries.second) {
        TimeValuePair dataPoint;
        dataPoint.unixTime = time_value_pair_.unixTime;
        dataPoint.value = time_value_pair_.value;
        perQueryResponse.timeSeries.push_back(dataPoint);
      }
      VLOG(2) << "perQueryResponse size of: "
              << perQueryResponse.timeSeries.size() << ", for keyId "
              << perQueryResponse.beringeiDBKey.key;
      response.timeSeriesAndKeyList.push_back(perQueryResponse);

      timeSeriesAndKeyListIdx++;
      queryReturnIdx++;
    } else {
      // Invalid request return empty
      response.timeSeriesAndKeyList.push_back(perQueryResponse);
      timeSeriesAndKeyListIdx++;
    }
  }

  return response;
}

// Used to find the Beringei BD Id of the metric
// Input: rawQueryKey
// Output: non-negative integer if success
//         kFail if fail
int64_t RawReadBeringeiData::findBeringeiKeyId(query::RawQueryKey rawQueryKey) {
  // Sanity Check, should only be used when Beringei keyId is not provided
  if (rawQueryKey.__isset.keyId) {
    LOG(ERROR) << "Should directly use Beringei Key ID";
    return kFail;
  }

  std::vector<std::string> stringsToSearch;
  if (rawQueryKey.__isset.peerMac) {
    stringsToSearch.push_back(
        "link." + rawQueryKey.peerMac + "." + rawQueryKey.metricName);
    stringsToSearch.push_back(
        "tgd." + rawQueryKey.peerMac + "." + rawQueryKey.metricName);
    stringsToSearch.push_back(
        "tgf." + rawQueryKey.peerMac + "." + rawQueryKey.metricName);
  } else {
    stringsToSearch.push_back(rawQueryKey.metricName);
    stringsToSearch.push_back(
        "tgf.00:00:00:00:00:00." + rawQueryKey.metricName);
  }

  folly::dynamic orderedMetricList = folly::dynamic::array;
  for (const auto& stringToSearch : stringsToSearch) {
    auto locked = typeaheadCache_.rlock();
    // Find the cache client for the topology
    auto taIt = locked->find(rawQueryKey.topologyName);
    if (taIt == locked->cend()) {
      LOG(ERROR) << "No type-ahead cache for \"" << rawQueryKey.topologyName
                 << "\"";
      return kFail;
    }
    auto taCache = taIt->second;
    std::vector<query::KeyData> metricList =
        taCache->getKeyData(stringToSearch);
    VLOG(4) << "getKeyData done for " << stringToSearch;
    locked.unlock();

    if (metricList.size() > 0) {
      folly::dynamic keyList = folly::dynamic::array;
      for (const auto& key : metricList) {
        VLOG(1) << "\t\tName: " << key.displayName << ", key: " << key.key
                << ", node: " << key.nodeName
                << ", Beringei keyId: " << key.keyId;
        keyList.push_back(folly::dynamic::object(
            "displayName", key.displayName)("key", key.key)("keyId", key.keyId)(
            "nodeName", key.nodeName)("siteName", key.siteName)(
            "node", key.node)("unit", (int)key.unit));
      }
      if (!keyList.isNull()) {
        orderedMetricList.push_back(keyList);
      }
    }
  }

  if (orderedMetricList.isNull()) {
    LOG(INFO) << "Cannot find any possible match!";
    return kFail;
  }
  VLOG(2) << "The rawQueryKey returns " << orderedMetricList.size()
          << " key list";
  // Via all combinations, there should be only 1 valid Beringei keyId, if
  // multiple match is found, return kFail
  int64_t targetKeyId = kFail;
  std::string wantedSourceMac = rawQueryKey.sourceMac;
  std::transform(
      wantedSourceMac.begin(),
      wantedSourceMac.end(),
      wantedSourceMac.begin(),
      ::tolower);

  for (const auto& key_list_ : orderedMetricList) {
    for (const auto& single_key_ : key_list_) {
      VLOG(4) << "The single_key_ is of node " << single_key_["node"]
              << " needed sourceMac:" << wantedSourceMac;
      if (single_key_["node"] == wantedSourceMac) {
        LOG(INFO) << "Found KeyId " << single_key_["keyId"].getInt()
                  << ", will use it for Beringei Query";
        LOG(INFO) << "targetKeyId" << targetKeyId;
        if (targetKeyId == kFail) {
          targetKeyId = single_key_["keyId"].getInt();
          fullMetricKeyName_.back() = single_key_["key"].getString();
        } else if (targetKeyId != single_key_["keyId"].getInt()) {
          // Find a keyId that is different to the one above return kFail
          LOG(ERROR) << "Found duplicated keyId will skip this Beringei Query";
          // When find duplicated keyId, clear the fullMetricKeyName
          fullMetricKeyName_.back() = "";
          return kFail;
        }
      }
    }
  }

  return targetKeyId;
}

} // namespace gorilla
} // namespace facebook
