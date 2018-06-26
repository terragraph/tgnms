/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
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

RawReadBeringeiData::RawReadBeringeiData(
  const query::RawReadQueryRequest& request,
  TACacheMap& typeaheadCache) : request_(request),
                                typeaheadCache_(typeaheadCache) {}

RawQueryReturn RawReadBeringeiData::process() {
  timeSeries_.clear();
  beringeiTimeSeries_.clear();
  // Final response to output
  RawQueryReturn response;
  for (const auto& query : request_.queries) {
    query_ = query;
    if (query_.query_key_list.empty()) {
      continue;
    }
    // TODO: recover later
    // << query_.metric_str_list
    LOG(INFO) << "Request for "
              << "between start timestamp " << query_.start_ts
              << " and end timestamp" << query_.end_ts;
    RawTimeSeriesList single_query_response;
    single_query_response = handleQuery();
    VLOG(5) << "Retrun query return of size: "
            << single_query_response.time_series_and_key_list.size();
    response.query_return_list.push_back(single_query_response);
  }
  return response;
}

// This function uses a list of Beringei Query and send to the Beringei Data
// Base for data. It returns a list of the obtianed time series, i.e., the
// query return for a single RawReadQuery.
RawTimeSeriesList RawReadBeringeiData::handleQuery() {
  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();
  // select the data source based on time interval
  LOG(INFO) << "Selected Beringei DB with interval = " << query_.interval;
  // validate first, prefer to throw here (no futures)
  validateQuery(query_);
  // fetch async data
  folly::EventBase eb;
  eb.runInLoop([this]() mutable {
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getReadClient(query_.interval);
    int numShards = beringeiClient->getNumShards();
    auto beringeiRequest = createBeringeiRequest(query_, numShards);
    beringeiClient->get(beringeiRequest, beringeiTimeSeries_);
  });
  std::thread tEb([&eb]() { eb.loop(); });
  tEb.join();
  auto fetchTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();
  auto columnNamesTime = (int64_t)duration_cast<milliseconds>(
                             system_clock::now().time_since_epoch())
                             .count();

  RawTimeSeriesList results{};
  results = LogRawOutput();
  beringeiTimeSeries_.clear();
  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Query completed "
            << "\" Fetch: " << (fetchTime - startTime) << "ms, "
            << "Event/Transform: " << (endTime - fetchTime) << "ms, "
            << "Total: " << (endTime - startTime) << "ms.";
  return results;
}

// validate the query and make the proper time window
void RawReadBeringeiData::validateQuery(const query::RawReadQuery& request) {
  int timeInterval_ = request.interval;
  if (request.start_ts != 0 && request.end_ts != 0) {
    startTime_ =
        std::ceil(request.start_ts / (double)timeInterval_) * timeInterval_;
    endTime_ =
        std::ceil(request.end_ts / (double)timeInterval_) * timeInterval_;
    LOG(INFO) << "Inputed Start: " << startTime_ << ", End: " << endTime_;
    if (endTime_ <= startTime_) {
      LOG(ERROR) << "Request for invalid time window: " << startTime_ << " <-> "
                 << endTime_;
      throw std::runtime_error("Request for invalid time window");
    }
  } else {
    // default to 1 day here
    startTime_ = std::time(nullptr) - (24 * 60 * 60);
    endTime_ = std::time(nullptr);
  }
  LOG(INFO) << "Request for start: " << startTime_ << " <-> " << endTime_
            << ", interval: " << timeInterval_ << " ,and "
            << request.query_key_list.size() << " keyIds to query";
}

// Translate RawReadQuery to GetDataRequest, which is the request data
// structure of Beringei Request
GetDataRequest RawReadBeringeiData::createBeringeiRequest(
    const query::RawReadQuery& request,
    const int numShards) {
  GetDataRequest beringeiRequest;

  beringeiRequest.begin_timestamp = startTime_;
  beringeiRequest.end_timestamp = endTime_;

  for (const auto& raw_query_key : request.query_key_list) {
    Key beringeiKey;
    // If keyid is provided use KeyId, if not, find the right keyid from MySQL
    if (raw_query_key.__isset.key_id){
      VLOG(4) << "The key_id " << raw_query_key.key_id
               << " is provided, use it without serach in MySQL";
      beringeiKey.key = std::to_string(raw_query_key.key_id);
    } else{
      // Find the right keyID via MySQL
      auto key_id = FindBeringeiKeyId(raw_query_key);
      VLOG(2) << "Found KeyId of " << key_id
              << " from MySQL";
      if (key_id == -1){
        VLOG(2) << "Cannot found valid KeyId by the provide metric from MySQL";
        // If not found, skip this metric
        continue;
      }
      beringeiKey.key = std::to_string(key_id);
    }

    // Currently, everything is shard 0 on the writer side
    // TODO: Once shared hash is done, update the shradID to be hash(key)
    beringeiKey.shardId = 0;
    beringeiRequest.keys.push_back(beringeiKey);
    LOG(INFO) << "There are " << beringeiRequest.keys.size()
              << " keyIds to query from Beringei DB";

    for (int i=0; i < beringeiRequest.keys.size(); i++){
      VLOG(2) << "The " << i << "-th "
              << " keyId is:" << beringeiRequest.keys[i].key;
    }
  }

  return beringeiRequest;
}

// Store the fetched time seriers into RawTimeSeriesList without any processing
// Once analytics models is finalized, can move computation hungry or frequent
// reads to here.
RawTimeSeriesList RawReadBeringeiData::LogRawOutput() {
  LOG(INFO) << "Begin LogRawOutput of "
            << beringeiTimeSeries_.size()
            << " series";

  RawTimeSeriesList response;

  std::string response_key;
  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    RawTimeSeries per_query_response;
    per_query_response.beringei_db_key.key = keyTimeSeries.first.key;
    per_query_response.beringei_db_key.shardId = keyTimeSeries.first.shardId;
    per_query_response.time_series.clear();

    for (const auto& time_value_pair_:keyTimeSeries.second){
      TimeValuePair data_point;
      data_point.unixTime = time_value_pair_.unixTime;
      data_point.value = time_value_pair_.value;
      per_query_response.time_series.push_back(data_point);
    }
    LOG(INFO) << "size of: " << per_query_response.time_series.size();
    response.time_series_and_key_list.push_back(per_query_response);
  }
  return response;
}

// Used to find the Beringei BD Id of the metric
// Input: raw_query_key
// Output: non-negative interger if success
//         -1 if fail
long long int RawReadBeringeiData::FindBeringeiKeyId(
                                            query::RawQueryKey raw_query_key){
  // Santity Check, should only be used when Beringei key_id is not provided
  if (raw_query_key.__isset.key_id){
    LOG(INFO) << "[ERROR]: Should directly use Beringei Key ID";
    return -1;
  }

  folly::dynamic orderedMetricList = folly::dynamic::array;
  auto locked = typeaheadCache_.rlock();
  // Find the cache client for the topology
  auto taIt = locked->find(raw_query_key.topology_name);
  if (taIt == locked->cend()) {
    LOG(ERROR) << "No type-ahead cache for \"" << raw_query_key.topology_name
               << "\"";
    return -1;
  }
  // this loop can be pretty lengthy so holding a lock the whole time isn't
  // ideal
  auto taCache = taIt->second;
  // TODO: tgf/tgd is for firmware, add log to also support system static
  // report later
  std::string string_to_serach;
  if (raw_query_key.__isset.z_mac){
    string_to_serach = "tgf." + raw_query_key.z_mac + "." +
                      raw_query_key.metric_name;
  } else {
    string_to_serach = "tgd." + raw_query_key.metric_name;
  }
  auto retMetrics = taCache->searchMetrics(string_to_serach);
  locked.unlock();
  for (const auto& metricList : retMetrics) {
    folly::dynamic keyList = folly::dynamic::array;
    for (const auto& key : metricList) {
      VLOG(1) << "\t\tName: " << key.displayName << ", key: " << key.key
              << ", node: " << key.nodeName;
      keyList.push_back(folly::dynamic::object(
          "displayName", key.displayName)("key", key.key)("keyId", key.keyId)(
          "nodeName", key.nodeName)("siteName", key.siteName)(
          "node", key.node)("unit", (int)key.unit));
    }
    // add to a list of key_list
    orderedMetricList.push_back(keyList);
  }

  VLOG(2) << "The raw_query_key returns " << orderedMetricList.size()
          << " key list";
  // TODO: It seems that the StatsTypeAheadCache can return multiple
  // (duplicate) keys with the same RawQueryKey. Now do a simple filltering.
  // Update this once StatsTypeAheadCache guartennas unique single return.
  // Everything in the stats typeaheadCache return is lower case now.
  std::string wanted_a_mac = raw_query_key.a_mac;
  std::transform(wanted_a_mac.begin(), wanted_a_mac.end(),
                 wanted_a_mac.begin(), ::tolower);
  for (const auto& key_list_:orderedMetricList){
    for (const auto& single_key_:key_list_){
      VLOG(4) << "The single_key_ is of node " << single_key_["node"]
              << " needed a_mac:" << wanted_a_mac;
      if (single_key_["node"] == wanted_a_mac){
        LOG(INFO) << "Found KeyId " << single_key_["keyId"].getInt()
                  << ", will use it for Beringei Query";
        return single_key_["keyId"].getInt();;
      }
    }
  }

  // Cannot find the matched key
  return -1;
}

} // namespace gorilla
} // namespace facebook
