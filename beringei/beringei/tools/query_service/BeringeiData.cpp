/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "BeringeiData.h"

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

const int MAX_COLUMNS = 7;
const int MAX_DATA_POINTS = 60;
const int NUM_HBS_PER_SEC = 39; // approximately

BeringeiData::BeringeiData(const query::QueryRequest& request)
    : request_(request) {}

folly::dynamic BeringeiData::process() {
  columnNames_.clear();
  timeSeries_.clear();
  aggSeries_.clear();
  beringeiTimeSeries_.clear();
  timeSeries_.clear();
  // one json response
  folly::dynamic response = folly::dynamic::array();
  for (const auto& query : request_.queries) {
    query_ = query;
    if (query_.key_ids.empty()) {
      continue;
    }
    LOG(INFO) << "Request for " << query_.key_ids.size() << " key ids of '"
              << query_.agg_type << "' aggregation, for " << query_.min_ago
              << " minutes ago.";
    folly::dynamic jsonQueryResp;
    jsonQueryResp = handleQuery();
    response.push_back(jsonQueryResp);
  }
  return response;
}

void BeringeiData::columnNames() {
  // set column names
  if (query_.agg_type == "top" || query_.agg_type == "bottom" ||
      query_.agg_type == "none") {
    // top, bottom, none
    std::unordered_set<std::string> keyNames;
    std::unordered_set<std::string> linkNames;
    std::unordered_set<std::string> nodeNames;
    std::unordered_set<std::string> displayNames;
    for (const auto& keyData : query_.data) {
      keyNames.insert(keyData.key);
      // add title append
      if (keyData.__isset.linkTitleAppend) {
        linkNames.insert(keyData.linkName + " " + keyData.linkTitleAppend);
      } else {
        linkNames.insert(keyData.linkName);
      }
      nodeNames.insert(keyData.nodeName);
      displayNames.insert(keyData.displayName);
    }
    for (const auto& keyData : query_.data) {
      std::string columnName = keyData.node;
      if (keyData.linkName.length() &&
          linkNames.size() == query_.key_ids.size()) {
        if (keyData.__isset.linkTitleAppend) {
          columnName = keyData.linkName + " " + keyData.linkTitleAppend;
        } else {
          columnName = keyData.linkName;
        }
      } else if (
          keyData.displayName.length() &&
          displayNames.size() == query_.key_ids.size()) {
        columnName = keyData.displayName;
      } else if (keyNames.size() == query_.key_ids.size()) {
        columnName = keyData.key;
      } else if (
          keyData.nodeName.length() &&
          nodeNames.size() == query_.key_ids.size()) {
        columnName = keyData.nodeName;
      } else {
        columnName = folly::sformat("{} / {}", keyData.nodeName, keyData.key);
      }
      std::replace(columnName.begin(), columnName.end(), '.', ' ');
      columnNames_.push_back(columnName);
    }
  }
}

/**
 * Uptime Handler
 *
 * Returns a map that maps from stat names to an array of uptime states where
 * each element indicates the state at that time bucket
 */

#define COUNTER_MARGIN_MS 500

BeringeiData::KeyUptimeStateMap BeringeiData::uptimeHandler(
    // time interval at which uptime counter is incremented e.g. 25.6 for
    // firmware uptime
    const double dataPointIncrementMs,
    // Beringei DB storage interval e.g. 30s
    const int timeBucketIntervalSec) {
  // number of time buckets within the start time and end time
  const int64_t timeBucketCount =
      (endTime_ - startTime_) / timeBucketIntervalSec;

  // number of keys within the beringeiTimeSeries
  const int keyCount = beringeiTimeSeries_.size();

  // expected rate of increase of uptimeCounter over every time bucket increment
  const double expectedStatCounterSlope =
      (timeBucketIntervalSec * 1000) / dataPointIncrementMs;

  // object containing the list of uptime states for each stat
  std::unordered_map<std::string, std::deque<UptimeState>> statToUptimeStates;

  // allocate array that will contain key's time series plot
  double* timeSeries = new double[timeBucketCount]();

  // loop through all the time series plots for each key
  for (int keyIndex = 0; keyIndex < keyCount; keyIndex++) {
    // set all values to -1 to distinguish between missing data and reported 0
    // as counter
    std::fill_n(timeSeries, timeBucketCount, -1);
    for (const auto& timePair : beringeiTimeSeries_[keyIndex].second) {
      int timeBucketId =
          (timePair.unixTime - startTime_) / timeBucketIntervalSec;
      // get the timePair value and store it within the timeSeries array within
      // the key at the correct time bucket
      timeSeries[timeBucketId] = timePair.value;
    }

    // last timeIndex when the state is UP, initialize to where loop starts
    double lastUpStateStartIndex = timeBucketCount;
    // if the value is missing/unknown, keep track of the expected stat counter
    // based off of the last known statCounter value
    double statCountFromLastKnownValue = 0;

    std::deque<UptimeState> uptimeStates;

    // loop through all the time buckets within the time series plot for the key
    // starting from the end of the time series plot
    for (int timeIndex = timeBucketCount - 1; timeIndex >= 0; timeIndex--) {
      // value at time within time series for the key
      double statCounter = timeSeries[timeIndex];

      // if statCounter is reported, stat is either up or down
      if (statCounter >= 0) {
        // calculate when the stat started going up from 0
        lastUpStateStartIndex =
            timeIndex - (statCounter / expectedStatCounterSlope);
        statCountFromLastKnownValue = statCounter;
        // if stat counter is less than the expected count increase (with margin
        // of error), stat must have been down in the past time bucket
        if (statCounter < expectedStatCounterSlope -
                (COUNTER_MARGIN_MS / dataPointIncrementMs)) {
          uptimeStates.push_front(UptimeState::DOWN);
        } else {
          uptimeStates.push_front(UptimeState::UP);
        }
      }
      // if statCounter is not set, then state is either MISSING or UNKNOWN
      else {
        // if the last calculated time when the stat went up was before the
        // current time and the predicted counter value at this time is more
        // than the expected counter slope, then stat must have been up, so
        // report missing state
        statCountFromLastKnownValue -= expectedStatCounterSlope;
        if (lastUpStateStartIndex < timeIndex &&
            statCountFromLastKnownValue > expectedStatCounterSlope -
                    (COUNTER_MARGIN_MS / dataPointIncrementMs)) {
          uptimeStates.push_front(UptimeState::MISSING);
        }
        // else, the stat went down so we dont know what happened
        else {
          uptimeStates.push_front(UptimeState::UNKNOWN);
        }
      }
    }
    std::string keyIdStr = folly::to<std::string>(query_.data[keyIndex].keyId);
    // add array of uptimeStates to the map with keyId as the key
    statToUptimeStates[keyIdStr] = std::move(uptimeStates);
  }
  delete[] timeSeries;
  return statToUptimeStates;
}

/**
 * Resolve differences in Uptime States between both directions of the link
 *
 * This function takes a map from keyIds to an array of UptimeStates and
 * resolves differences in state between the two directions of the link. It
 * modifies the input of one direction of the link with the resolved states and
 * erases the other direction from the map.
 */

void BeringeiData::resolveLinkUptimeDifference(
   // modifying the contents of keysToUptimeStates to take out link duplicates
   BeringeiData::KeyUptimeStateMap& keysToUptimeStates) {

 // loop through all keys and create events based on the key's states
 // map from displayName to states
 std::unordered_map<
     std::string,
     std::shared_ptr<std::deque<BeringeiData::UptimeState>>>
     linkNameAndDirToStates;
 KeyUptimeStateMap filteredMap;

 // keep track of links already in the filteredUptimeStates in order to avoid
 // duplicate links (since links of both directions are in uptimeStates)
 std::unordered_set<std::string /* linkNames */> linkNamesInFilter;

 // map from keyId to query with keyId
 std::unordered_map<std::string /* keyId */, query::KeyData> keyIdToQuery;
 for (const auto& queryData : query_.data) {
   const std::string& keyIdStr = std::to_string(queryData.keyId);
   keyIdToQuery[keyIdStr] = queryData;
 }

 // map from display names to uptimeStates for the link to find link of other
 // direction
 for (const auto& keyToStatesPair : keysToUptimeStates) {
   const std::string& keyIdStr = keyToStatesPair.first;
   query::KeyData queryData = keyIdToQuery[keyIdStr];
   const std::string& linkDir =
       (queryData.linkTitleAppend.find("A") != std::string::npos) ? "(A)" : "(Z)";
   const std::string& linkNameAndDir = queryData.linkName + " " + linkDir;
   linkNameAndDirToStates[linkNameAndDir] =
       std::make_shared<std::deque<BeringeiData::UptimeState>>(
           keyToStatesPair.second);
 }
 auto keyMapIt = keysToUptimeStates.begin();
 while (keyMapIt != keysToUptimeStates.end()) {
   const std::string& keyIdStr = keyMapIt->first;
   const std::string& linkName = keyIdToQuery[keyIdStr].linkName;
   const std::string& aOrZ = keyIdToQuery[keyIdStr].linkTitleAppend;

   // if we have already seen this link but in the other direction, skip this
   // link
   if (linkNamesInFilter.find(linkName) != linkNamesInFilter.end()) {
     // remove this direction from the original map
     keyMapIt = keysToUptimeStates.erase(keysToUptimeStates.find(keyIdStr));
     continue;
   } else {
     linkNamesInFilter.insert(linkName);
   }

   // Get uptimeStates of link with current direction
   std::deque<UptimeState>& uptimeStates = keyMapIt->second;

   // Find and get uptimeStates of link going in the opposite direction
   std::deque<UptimeState> uptimeStatesOtherDir;
   const std::string& oppLinkDir =
       (aOrZ.find("A") != std::string::npos) ? "(Z)" : "(A)";
   // If there exists a link going in the opposite direction, set uptime states
   // in the other direction to this link's uptimeStates
   if (linkNameAndDirToStates.find(linkName + " " + oppLinkDir) !=
       linkNameAndDirToStates.end()) {
     uptimeStatesOtherDir =
         *(linkNameAndDirToStates[linkName + " " + oppLinkDir]);
   }

   if (!uptimeStatesOtherDir.empty()) {
     for (int stateIndex = 0; stateIndex < uptimeStates.size(); stateIndex++) {
       // if UptimeState of link going in other direction is DOWN, then that
       // overrides the state of the link going in the current direction
       if (uptimeStatesOtherDir[stateIndex] == UptimeState::DOWN) {
         uptimeStates[stateIndex] = UptimeState::DOWN;
       }
       if (uptimeStatesOtherDir[stateIndex] == UptimeState::UP) {
         uptimeStates[stateIndex] = UptimeState::UP;
       }
     }
   }
   ++keyMapIt;
 }
}

/**
 * Event Handler
 *
 * Creates a json response containing a list of events for the metric given
 * and the percentage that the metric was up
 */
folly::dynamic BeringeiData::eventHandler(
    const double dataPointIncrementMs,
    const std::string& metricName,
    const MetricType metricType) {
  // map from keyId to query with keyId
  std::unordered_map<std::string, query::KeyData> keyIdToQuery;
  for (const auto& queryData : query_.data) {
    std::string keyIdStr = std::to_string(queryData.keyId);
    keyIdToQuery[keyIdStr] = queryData;
  }

  // get uptimeStates for every key from uptimeHandler for 30s time buckets
  std::unordered_map<std::string, std::deque<UptimeState>> keysToUptimeStates =
      uptimeHandler(dataPointIncrementMs, 30);

  if (metricType == MetricType::LINK) {
    resolveLinkUptimeDifference(keysToUptimeStates);
  }

  // create an object to store results about the key to be returned in the
  // response
  folly::dynamic keyResults = folly::dynamic::object;

  // loop through all keys and create events based on the key's states
  for (auto& keyToStatesPair : keysToUptimeStates) {
    folly::dynamic onlineEvents = folly::dynamic::array;

    const std::string& keyIdStr = keyToStatesPair.first;
    const std::string& name = metricType == MetricType::LINK
        ? keyIdToQuery[keyIdStr].linkName
        : keyIdToQuery[keyIdStr].displayName;
    std::deque<UptimeState> uptimeStates = keyToStatesPair.second;

    // keep track of the most recent moment when state switched to UP
    int startTimeIndex = 0;
    // keep track of the amount of time state is DOWN
    int downTime = 0;
    // track whether the last known (meaning not UNKNOWN) state is UP
    bool prevKnownStateIsUp = false;

    VLOG(3) << "=============== CREATING EVENTS FOR KEY " << name << " "
            << keyIdStr << " ===============";
    for (int stateIndex = 0; stateIndex < uptimeStates.size(); stateIndex++) {
      // State is considered down (down meaning either DOWN or UNKNOWN)
      if (uptimeStates[stateIndex] == UptimeState::DOWN ||
          uptimeStates[stateIndex] == UptimeState::UNKNOWN) {
        // if the state crashes (switches from up to down), end the current
        // event
        if (prevKnownStateIsUp) {
          onlineEvents.push_back(makeEvent(startTimeIndex + 1, stateIndex - 1));
        }

        downTime++;
        startTimeIndex = stateIndex;
        prevKnownStateIsUp = false;
      }

      if (uptimeStates[stateIndex] == UptimeState::UP) {
        prevKnownStateIsUp = true;
      }
    }
    // make final event if the last state known state seen is UP
    if (uptimeStates.size() > 0 && prevKnownStateIsUp) {
      onlineEvents.push_back(
          makeEvent(startTimeIndex + 1, uptimeStates.size() - 1));
    }

    VLOG(3) << "EVENTS CREATED: ";
    for (const auto& event : onlineEvents) {
      VLOG(3) << event;
    }

    // calculate uptime percentage from downTime counter
    double metricUptimePerc = 0;
    if (!uptimeStates.empty()) {
      metricUptimePerc = 100 * (1 - ((double)downTime / uptimeStates.size()));
    }

    // store results into keyResults
    keyResults[name] = folly::dynamic::object;
    keyResults[name][metricName] = metricUptimePerc;
    keyResults[name]["events"] = onlineEvents;
  }

  // store all keyResults into overall response, along with start and end time
  folly::dynamic response = folly::dynamic::object;
  response["metrics"] = keyResults;
  response["start"] = startTime_ * 1000;
  response["end"] = endTime_ * 1000;

  return response;
}

std::string BeringeiData::getTimeStr(time_t timeSec) {
  char timeStr[100];
  std::strftime(timeStr, sizeof(timeStr), "%T", std::localtime(&timeSec));
  return std::string(timeStr);
}

/*
 * Create a single event
 */
folly::dynamic BeringeiData::makeEvent(int64_t startIndex, int64_t endIndex) {
  int uptimeDurationSec = (endIndex - startIndex) * 30;
  // Online for [duration text] from [start time] to [end time]
  std::string title = folly::sformat(
      "{} minutes from {} to {}",
      (uptimeDurationSec / 60),
      getTimeStr(startTime_ + (startIndex * 30)),
      getTimeStr(startTime_ + (endIndex * 30)));
  return folly::dynamic::object("startTime", (startTime_ + (startIndex * 30)))(
      "endTime", (startTime_ + (endIndex * 30)))("title", title);
}

folly::dynamic BeringeiData::latest() {
  int keyCount = beringeiTimeSeries_.size();
  int keyIndex = 0;
  // store the latest value for each key
  double latestValue[keyCount]{};
  folly::dynamic response = folly::dynamic::object;
  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    const std::string& keyName = keyTimeSeries.first.key;
    if (keyTimeSeries.second.size()) {
      const std::string& displayName = query_.data[keyIndex].displayName;
      if (response.count(displayName)) {
        LOG(WARNING) << "Over-writing response for " << displayName;
      }
      response[displayName] = keyTimeSeries.second.back().value;
    }
    keyIndex++;
  }
  return response;
}

void BeringeiData::valueOrNull(folly::dynamic& obj, double value, int count) {
  if (value == std::numeric_limits<double>::max() || std::isnan(value) ||
      std::isinf(value)) {
    obj.push_back(nullptr);
  } else if (count > 1) {
    obj.push_back((double)value / count);
  } else {
    obj.push_back(value);
  }
}

folly::dynamic BeringeiData::transform() {
  // time align all data
  // with the query to beringei we're receiving the start and end time slots
  // which gives us (dps + 1) slots
  // EX: 1-minute query is 61 dps
  int64_t timeBucketCount = (endTime_ - startTime_) / timeInterval_ + 1;
  // 1-minute = 60 DPs
  int keyCount = beringeiTimeSeries_.size();
  // pre-allocate the array size
  double* timeSeries = new double[keyCount * timeBucketCount]{};
  int dataPointAggCount = 1;
  if (timeBucketCount > MAX_DATA_POINTS) {
    dataPointAggCount = std::ceil((double)timeBucketCount / MAX_DATA_POINTS);
  }
  int condensedBucketCount =
      std::ceil((double)timeBucketCount / dataPointAggCount);
  int countPerBucket[keyCount][condensedBucketCount]{};
  // allocate condensed time series, sum series (by key) for later
  // sorting, and sum of time bucket
  double cTimeSeries[keyCount][condensedBucketCount]{};
  double sumSeries[keyCount]{};
  // sum of all known data points in each bucket
  double sumTimeBucket[condensedBucketCount]{};
  // sum of the average of known data points in each bucket
  double sumOfAvgTimeBucket[condensedBucketCount]{};
  int countTimeBucket[condensedBucketCount]{};
  int keyIndex = 0;
  // store the latest value for each key
  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    const std::string& keyName = keyTimeSeries.first.key;
    // VLOG(1) << "Key: " << keyName << ", index: " << keyIndex;
    // fetch the last value, assume 0 for not-found
    for (const auto& timePair : keyTimeSeries.second) {
      int timeBucketId = (timePair.unixTime - startTime_) / timeInterval_;
      // log # of dps per bucket for DP smoothing
      int condensedBucketId =
          timeBucketId > 0 ? (timeBucketId / dataPointAggCount) : 0;
      if (condensedBucketId == condensedBucketCount) {
        condensedBucketId = condensedBucketCount - 1;
        //        LOG(INFO) << "Rolling back condensedBucketId -> " <<
        //        condensedBucketId
        //                  << ", keyIndex: " << keyIndex;
      }
      // VLOG(1) << "\t(" << timePair.unixTime << ") = " <<
      // std::to_string(timePair.value);
      int oldIndex = (keyIndex * timeBucketCount + timeBucketId);
      int newIndex =
          (keyIndex * timeBucketCount +
           (condensedBucketId * dataPointAggCount) +
           countPerBucket[keyIndex][condensedBucketId]);
      if (timePair.unixTime < startTime_ || timePair.unixTime > endTime_) {
        LOG(ERROR) << "Time outside of start/end window. timePair.unixTime: "
                   << timePair.unixTime << ", start: " << startTime_
                   << ", end: " << endTime_;
      }

      if (isnan(timePair.value)) {
        continue;
      }
      // aggregate count by bucket (per-key)
      countPerBucket[keyIndex][condensedBucketId]++;
      // aggregate count by time bucket (all-keys)
      countTimeBucket[condensedBucketId]++;

      // place the value into the next position in the bucket (don't care
      // about the correct time slot in the bucket)
      timeSeries[newIndex] = timePair.value;
      // sum all data-points in the series
      sumSeries[keyIndex] += timePair.value;
      sumTimeBucket[condensedBucketId] += timePair.value;
    }
    keyIndex++;
  }
  for (int i = 0; i < keyCount; i++) {
    int timeBucketId = 0;
    int startBucketId = 0;
    while (startBucketId < timeBucketCount) {
      // number of data-points in condensed bucket (ignoring missing)
      if (timeBucketId == condensedBucketCount) {
        timeBucketId = condensedBucketCount - 1;
        //        LOG(INFO) << "Rolling back timeBucketId -> " << timeBucketId
        //                  << ", key (i): " << i;
      }
      int bucketDpCount = countPerBucket[i][timeBucketId];
      double sum = std::numeric_limits<double>::max();
      double avg = std::numeric_limits<double>::max();
      double min = std::numeric_limits<double>::max();
      double max = std::numeric_limits<double>::max();
      // perform aggregations only if we have data
      if (bucketDpCount > 0) {
        // sum all non-missing data points
        sum = std::accumulate(
            &timeSeries[i * timeBucketCount + startBucketId],
            &timeSeries
                [i * timeBucketCount + startBucketId +
                 bucketDpCount /* do we need +1 for .end()? */],
            0.0);
        if (!isnan(sum)) {
          // divide by the # of DPs in the bucket, ignoring missing data
          avg = sum / (double)(bucketDpCount);
        }
        sumOfAvgTimeBucket[timeBucketId] += avg;
        // min + max over the real data
        auto minMax = std::minmax_element(
            &timeSeries[i * timeBucketCount + startBucketId],
            &timeSeries
                [i * timeBucketCount + startBucketId +
                 bucketDpCount /* todo - same question */]);
        min = *minMax.first;
        max = *minMax.second;
      }
      if (query_.agg_type == "avg") {
        // the time aggregated bucket for this key
        if (i == 0) {
          aggSeries_["min"].push_back(min);
          aggSeries_["max"].push_back(max);
        } else {
          aggSeries_["min"][timeBucketId] =
              std::min(aggSeries_["min"][timeBucketId], min);
          // max only added if count is set
          if (bucketDpCount > 0) {
            if (aggSeries_["max"][timeBucketId] ==
                std::numeric_limits<double>::max()) {
              aggSeries_["max"][timeBucketId] = max;
            } else {
              aggSeries_["max"][timeBucketId] =
                  std::max(aggSeries_["max"][timeBucketId], max);
            }
          }
        }
      } else if (query_.agg_type == "count") {
        double countSum = countTimeBucket[timeBucketId];
        double countAvg =
            countSum == 0 ? 0 : (countSum / (double)(bucketDpCount));
        aggSeries_[query_.agg_type].push_back(countAvg);
      } else {
        // no aggregation
        cTimeSeries[i][timeBucketId] = avg;
      }
      // set next bucket
      startBucketId += dataPointAggCount;
      timeBucketId++;
    }
  }
  // now we have time aggregated data
  // sort by avg value across time series if needed
  folly::dynamic datapoints = folly::dynamic::array();
  for (int i = 0; i < condensedBucketCount; i++) {
    datapoints.push_back(folly::dynamic::array(
        (startTime_ + (i * dataPointAggCount * timeInterval_)) * 1000));
  }
  folly::dynamic columns = folly::dynamic::array();
  columns.push_back("time");
  if (query_.agg_type == "bottom" || query_.agg_type == "top") {
    if (keyCount > MAX_COLUMNS) {
      // sort data
      std::vector<std::pair<int, double>> keySums;
      for (int i = 0; i < keyCount; i++) {
        keySums.push_back(std::make_pair(i, sumSeries[i]));
      }
      // sort for 'bottom' aggregation, ignoring nan/inf data
      auto sortLess = [](auto& lhs, auto& rhs) {
        if (std::isnan(rhs.second) || std::isinf(rhs.second)) {
          return true;
        }
        if (std::isnan(lhs.second) || std::isinf(lhs.second)) {
          return false;
        }
        return lhs.second < rhs.second;
      };
      // sort for 'top' aggregation, ignoring nan/inf data
      auto sortGreater = [](auto& lhs, auto& rhs) {
        if (std::isnan(lhs.second) || std::isinf(lhs.second)) {
          return false;
        }
        if (std::isnan(rhs.second) || std::isinf(rhs.second)) {
          return true;
        }
        return lhs.second > rhs.second;
      };
      if (query_.agg_type == "bottom") {
        std::sort(keySums.begin(), keySums.end(), sortLess);
      } else {
        std::sort(keySums.begin(), keySums.end(), sortGreater);
      }
      keySums.resize(MAX_COLUMNS);
      for (const auto& kv : keySums) {
        columns.push_back(columnNames_[kv.first]);
        // loop over time series
        for (int i = 0; i < condensedBucketCount; i++) {
          valueOrNull(datapoints[i], cTimeSeries[kv.first][i]);
        }
      }
    } else {
      // agg series
      for (int i = 0; i < keyCount; i++) {
        columns.push_back(columnNames_[i]);
        // loop over time series
        for (int e = 0; e < condensedBucketCount; e++) {
          valueOrNull(datapoints[e], cTimeSeries[i][e]);
        }
      }
    }
  } else if (query_.agg_type == "sum") {
    columns.push_back(query_.agg_type);
    for (int i = 0; i < condensedBucketCount; i++) {
      // divide by the received data points per interval?
      valueOrNull(datapoints[i], sumOfAvgTimeBucket[i]);
    }
  } else if (query_.agg_type == "count") {
    for (const auto& aggSerie : aggSeries_) {
      columns.push_back(aggSerie.first);
      for (int i = 0; i < condensedBucketCount; i++) {
        valueOrNull(datapoints[i], aggSerie.second[i]);
      }
    }
  } else if (query_.agg_type == "avg") {
    // adds min + max from above
    for (const auto& aggSerie : aggSeries_) {
      columns.push_back(aggSerie.first);
      for (int i = 0; i < condensedBucketCount; i++) {
        valueOrNull(datapoints[i], aggSerie.second[i]);
      }
    }
    // add average from sum values
    columns.push_back("avg");
    for (int i = 0; i < condensedBucketCount; i++) {
      if (countTimeBucket[i] > 0) {
        // divide by the # of received data points for the bucket
        valueOrNull(datapoints[i], sumTimeBucket[i], countTimeBucket[i]);
      } else {
        valueOrNull(datapoints[i], std::numeric_limits<double>::max());
      }
    }
  } else if (query_.agg_type == "none") {
    // agg series
    for (int i = 0; i < keyCount; i++) {
      columns.push_back(columnNames_[i]);
      // loop over time series
      for (int e = 0; e < condensedBucketCount; e++) {
        valueOrNull(datapoints[e], cTimeSeries[i][e]);
      }
    }
  }
  int dpC = 0;
  for (const auto& dpLine : datapoints) {
    try {
      folly::toJson(dpLine);
    } catch (const std::exception& ex) {
      for (const auto& dp : dpLine) {
        LOG(INFO) << "\t\tDP: " << dp;
      }
      LOG(ERROR) << "toJson failed: " << ex.what();
    }

    dpC++;
  }
  delete[] timeSeries;
  folly::dynamic response = folly::dynamic::object;
  response["name"] = "id";
  response["columns"] = columns;
  response["points"] = datapoints;
  return response;
}

#define MIN_UPTIME_FOR_CALC 60 /* in seconds */
#define INVALID_VALUE 0xff
#define BUG_FOUND 0xfe
#define MIN_MDPUS_FOR_PER_PER_SEC 100
#define LINK_A 0
#define LINK_Z 1

double BeringeiData::calculateAverage(
    double* timeSeries,
    bool* valid,
    int timeSeriesStartIndex,
    int minIdx,
    int maxIdx,
    bool mcsflag) {
  double numValidSamples = 0;
  double accsum = 0;
  double avg = INVALID_VALUE;
  for (int timeindex = minIdx; timeindex <= maxIdx; timeindex++) {
    if (valid[timeSeriesStartIndex + timeindex]) {
      // don't count MCS = 0
      if (mcsflag && timeSeries[timeSeriesStartIndex + timeindex] == 0) {
        continue;
      }
      accsum += timeSeries[timeSeriesStartIndex + timeindex];
      numValidSamples = numValidSamples + 1;
    }
  }

  if (numValidSamples > 0) {
    avg = accsum / numValidSamples;
  }
  return avg;
}

/* analyzerTable takes the results of a Beringei time series query with multiple
 * keys and creates a json result:
 * {"end":time, "start":time,"metrics":{<linknameA>:{"avgper":value,
 * "avgsnr":value, ...}}}
 * function assumes it will be given ssnrEst, txOk, txFail, mcs for multiple
 * nodes
 * input: beringeiTimeWindowS, the minimum time spacing (30s default)
 */
folly::dynamic BeringeiData::analyzerTable(int beringeiTimeWindowS) {
  VLOG(3) << "AT: BeringeiData::analyzerTable";
  // endTime_ and startTime_ are from the request, not necessarily the
  // Beringei response
  int64_t timeBucketCount = (endTime_ - startTime_) / beringeiTimeWindowS;
  const int numKeysReturned = beringeiTimeSeries_.size();
  int keyIndex = 0;
  // map returned key -> index
  std::unordered_map<std::string, int64_t> keyMapIndex;
  // there is one keyIndex for every parameter and every link
  // for example, MCS from A->Z is one keyIndex
  for (const auto& keyId : query_.key_ids) {
    keyMapIndex[std::to_string(keyId)] = keyIndex;
    keyIndex++;
  }
  // it is possible that not all of the keys queried are returned by the query
  const int numKeysQueried = keyIndex;

  // find the number of unique links
  // linkindex is a doubly subscripted array
  // linkindex[linkName][a_or_z] = link number;
  // e.g. linkindex["link-15-30.s2-15-49.s1"]["(Z)"] = 4;
  folly::dynamic linkindex = folly::dynamic::object;
  // linkNameByLinkNum[link number] = linkName (e.g. link-15-30.s2-15-49.s1)
  folly::dynamic linkNameByLinkNum = folly::dynamic::object;
  // // linkdir[link number] = "(A)" or "(Z)"
  // folly::dynamic linkdir = folly::dynamic::object;
  // keylink maps the keyIndex to the link number
  int keylink[numKeysQueried];
  // numlinks is the total number of unique links (A->Z and Z->A are
  // the same link)
  int numlinks = 0;
  VLOG(3) << "AT: numKeysReturned:" << numKeysReturned
          << " numKeysQueried:" << numKeysQueried;
  for (int keyIndex = 0; keyIndex < numKeysQueried; keyIndex++) {
    auto& key = query_.data[keyIndex].key;
    auto& linkName = query_.data[keyIndex].linkName;
    auto& a_or_z = query_.data[keyIndex].linkTitleAppend;
    // if this link hasn't been seen yet
    if (linkindex.find(linkName) == linkindex.items().end()) {
      linkindex[linkName] = numlinks;
      linkNameByLinkNum[numlinks] =
          linkName; // example:
                    // link-terra111.f5.tb.a404-if-terra212.f5.tb.a404-if
      numlinks++;
    }
    keylink[keyIndex] = folly::convertTo<int>(linkindex[linkName]);
  }

  // all values are initialized to zero
  double* timeSeries = new double[query_.key_ids.size() * timeBucketCount]();
  // valid is a boolean array of true/false to indicate if value is valid
  bool* valid = new bool[query_.key_ids.size() * timeBucketCount]();
  // minValidTimeBucketId and maxValidTimeBucketId are the smallest and largest
  // valid time bucket index
  int minValidTimeBucketId[numlinks][2] = {};
  int maxValidTimeBucketId[numlinks][2] = {};
  // numFlaps and upTime should be the same in both directions except
  // for missing data
  int numFlaps[numlinks][2] = {};
  int upTimeSec[numlinks][2] = {};
  bool found[numlinks][2] = {};

  // this loop fills timeSeries[] and valid[]
  // loop is over all keys (a key is, e.g.
  // tgf.38:3a:21:b0:11:e2.phystatus.ssnrEst)
  // the loop also finds the number of link flaps and the beginning and end
  // of the most recent time the link was up
  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    // the keyName is the unique number stored in mysql
    // e.g. 38910993
    const std::string& keyName = keyTimeSeries.first.key;
    keyIndex = keyMapIndex[keyName];
    auto& linkName = query_.data[keyIndex].linkName;
    int linkNum = folly::convertTo<int>(linkindex[linkName]);
    auto& a_or_z = query_.data[keyIndex].linkTitleAppend;
    int link = (a_or_z.find("A") != std::string::npos) ? LINK_A : LINK_Z;
    auto& key = query_.data[keyIndex].key;
    // convert the key names to lower case
    // e.g. tgf.38:3a:21:b0:11:e2.phystatus.ssnrEst
    std::transform(key.begin(), key.end(), key.begin(), ::tolower);
    bool first = true;
    int firstValue = 0;
    unsigned int prevValue = 0;
    for (const auto& timePair : keyTimeSeries.second) {
      int timeBucketId = (timePair.unixTime - startTime_) / beringeiTimeWindowS;
      timeSeries[keyIndex * timeBucketCount + timeBucketId] = timePair.value;
      valid[keyIndex * timeBucketCount + timeBucketId] = true;
      // beringeiTimeSeries_ has "value" and "unixTime"
      // see .../beringei/lib/TimeSeriesStream-inl.h -- addValueToOutput()
      // and TimeSeriesStream::readValues
      // in readValues() it only adds a value to the output if it is valid

      // find the number of link transitions (flaps) and find the beginning of
      // the last time link was up
      if ((key.find("uplinkbwreq") != std::string::npos) ||
          (key.find("keepalive") != std::string::npos) ||
          (key.find("heartbeat") != std::string::npos)) {
        if (first) {
          minValidTimeBucketId[linkNum][link] = timeBucketId;
          firstValue = timePair.value;
          first = false;
        }
        int expectedHBcount = firstValue +
            (timeBucketId - minValidTimeBucketId[linkNum][link]) *
                NUM_HBS_PER_SEC * beringeiTimeWindowS;
        found[linkNum][link] = true;
        // if the current HB counter is less than the last one or if it is
        // much less than the expectedHBcount, assume the link went down and
        // start over
        if (timePair.value < prevValue ||
            (timePair.value < expectedHBcount * 0.9)) {
          firstValue = timePair.value;
          numFlaps[linkNum][link]++;
          minValidTimeBucketId[linkNum][link] = timeBucketId;
        }
        upTimeSec[linkNum][link] =
            (timeBucketId - minValidTimeBucketId[linkNum][link]) *
            beringeiTimeWindowS;
        maxValidTimeBucketId[linkNum][link] = timeBucketId;
      }
      prevValue = timePair.value;
    }
  }

  // calculate statistics for each link, we need a separate loop because
  // for example, PER = txFail/(txOk+txFail) - we need to calculate txOK and
  // txFail before we can calculate PER -logic is simpler
  double diffTxOk[numlinks][2];
  double diffTxFail[numlinks][2];
  double avgSnr[numlinks][2];
  double avgMcs[numlinks][2];
  double avgTxPower[numlinks][2];

  // initialize the variables
  for (int keyIndex = 0; keyIndex < numKeysQueried; keyIndex++) {
    auto& linkName = query_.data[keyIndex].linkName;
    int linkNum = folly::convertTo<int>(linkindex[linkName]);
    auto& a_or_z = query_.data[keyIndex].linkTitleAppend;
    int link = (a_or_z.find("A") != std::string::npos) ? LINK_A : LINK_Z;

    diffTxOk[linkNum][link] = INVALID_VALUE;
    diffTxFail[linkNum][link] = INVALID_VALUE;
    avgSnr[linkNum][link] = INVALID_VALUE;
    avgMcs[linkNum][link] = INVALID_VALUE;
    avgTxPower[linkNum][link] = INVALID_VALUE;
  }

  for (const auto& keyTimeSeries : beringeiTimeSeries_) {
    const std::string& keyName = keyTimeSeries.first.key;
    keyIndex = keyMapIndex[keyName];
    auto& key = query_.data[keyIndex].key;
    // convert the key names to lower case
    // e.g. tgf.38:3a:21:b0:11:e2.phystatus.ssnrEst
    std::transform(key.begin(), key.end(), key.begin(), ::tolower);
    auto& linkName = query_.data[keyIndex].linkName;
    auto& a_or_z = query_.data[keyIndex].linkTitleAppend;
    int link = (a_or_z.find("A") != std::string::npos) ? LINK_A : LINK_Z;
    int linkNum = folly::convertTo<int>(linkindex[linkName]);
    if (!found[linkNum][link]) {
      VLOG(1) << "AT: ERROR: link has no HB:" << linkName << a_or_z;
      avgMcs[linkNum][link] = BUG_FOUND;
      continue;
    }

    if (upTimeSec[linkNum][link] > MIN_UPTIME_FOR_CALC) {
      bool minMaxTimesValid = valid
                                  [keyIndex * timeBucketCount +
                                   minValidTimeBucketId[linkNum][link]] &&
          valid[keyIndex * timeBucketCount +
                maxValidTimeBucketId[linkNum][link]];

      if (key.find("txok") != std::string::npos) {
        if (minMaxTimesValid) {
          diffTxOk[linkNum][link] = timeSeries
                                        [keyIndex * timeBucketCount +
                                         maxValidTimeBucketId[linkNum][link]] -
              timeSeries[keyIndex * timeBucketCount +
                         minValidTimeBucketId[linkNum][link]];
        } else {
          VLOG(1) << "AT ERROR: min/max times not valid for diffTxOk";
          diffTxOk[linkNum][link] = BUG_FOUND;
        }
        if (diffTxOk[linkNum][link] < 0) {
          VLOG(1) << "AT ERROR: diffTxOk < 0";
          diffTxOk[linkNum][link] = BUG_FOUND;
        }
      }
      if (key.find("txfail") != std::string::npos) {
        if (minMaxTimesValid) {
          diffTxFail[linkNum]
                    [link] = timeSeries
                                 [keyIndex * timeBucketCount +
                                  maxValidTimeBucketId[linkNum][link]] -
              timeSeries[keyIndex * timeBucketCount +
                         minValidTimeBucketId[linkNum][link]];
        } else {
          VLOG(1) << "AT ERROR: min/max times not valid for diffTxFail";
          diffTxFail[linkNum][link] = BUG_FOUND;
        }
        if (diffTxFail[linkNum][link] < 0) {
          VLOG(1) << "AT ERROR: diffTxFail < 0";
          diffTxFail[linkNum][link] = BUG_FOUND;
        }
      }
      if (key.find("ssnrest") != std::string::npos) {
        avgSnr[linkNum][link] = calculateAverage(
            timeSeries,
            valid,
            keyIndex * timeBucketCount,
            minValidTimeBucketId[linkNum][link],
            maxValidTimeBucketId[linkNum][link],
            false);
      }
      if (key.find("mcs") != std::string::npos) {
        avgMcs[linkNum][link] = calculateAverage(
            timeSeries,
            valid,
            keyIndex * timeBucketCount,
            minValidTimeBucketId[linkNum][link],
            maxValidTimeBucketId[linkNum][link],
            true);
      }
      if (key.find("txpowerindex") != std::string::npos) {
        avgTxPower[linkNum][link] = calculateAverage(
            timeSeries,
            valid,
            keyIndex * timeBucketCount,
            minValidTimeBucketId[linkNum][link],
            maxValidTimeBucketId[linkNum][link],
            false);
      }
    }
  }

  folly::dynamic linkparams = folly::dynamic::object;
  folly::dynamic metrics = folly::dynamic::object;
  std::vector<std::string> linkdir = {"A", "Z"};
  // return processed statistics
  for (int linkNum = 0; linkNum < numlinks; linkNum++) {
    for (int link = LINK_A; link <= LINK_Z; link++) {
      double avgPer = INVALID_VALUE;
      double dok = diffTxOk[linkNum][link];
      double dfail = diffTxFail[linkNum][link];
      if (dfail == BUG_FOUND || dok == BUG_FOUND) {
        avgPer = BUG_FOUND;
      } else if (
          dfail != INVALID_VALUE && dok != INVALID_VALUE && (dfail + dok > 0)) {
        avgPer = dfail / (dfail + dok);
      }

      // calculate average throughput in packets per second
      double tputPPS = 0.0;
      if (upTimeSec[linkNum][link] > 0) {
        tputPPS = (dfail + dok) / (double)(upTimeSec[linkNum][link]);
      }

      linkparams["avgper"] = avgPer;
      linkparams["avgsnr"] = avgSnr[linkNum][link];
      linkparams["avgtxpower"] = avgTxPower[linkNum][link];
      linkparams["avgmcs"] = avgMcs[linkNum][link];
      linkparams["tput"] = tputPPS;
      linkparams["flaps"] = numFlaps[linkNum][link];
      linkparams["uptime"] = upTimeSec[linkNum][link];
      if (!metrics[linkNameByLinkNum[linkNum]].isObject()) {
        metrics[linkNameByLinkNum[linkNum]] = folly::dynamic::object;
      }
      metrics[linkNameByLinkNum[linkNum]][linkdir[link]] = linkparams;
    }
  }
  delete[] timeSeries;
  delete[] valid;
  folly::dynamic response = folly::dynamic::object;
  response["name"] = "analyzerTable";
  response["start"] = startTime_ * 1000;
  response["end"] = endTime_ * 1000;
  response["metrics"] = metrics;
  return response;
}

void BeringeiData::selectBeringeiDb(int32_t interval) {
  // determine which data-source to query from based on total time
  int64_t timeBucketSec = (endTime_ - startTime_);
  // TODO: we need to define a generic way of stating retention per time
  // interval (1s, 30s) for querying from the right data source

  // use provided interval from query (defaults to 30s in thrift)
  timeInterval_ = interval;
  LOG(INFO) << "Selected time interval = " << timeInterval_;
}

folly::dynamic BeringeiData::handleQuery() {
  auto startTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();
  // select the data source based on time interval
  selectBeringeiDb(query_.interval);
  // validate first, prefer to throw here (no futures)
  validateQuery(query_);
  // fetch async data
  folly::EventBase eb;
  eb.runInLoop([this]() mutable {
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiClient = beringeiClientStore->getReadClient(timeInterval_);
    int numShards = beringeiClient->getNumShards();
    auto beringeiRequest = createBeringeiRequest(query_, numShards);
    beringeiClient->get(beringeiRequest, beringeiTimeSeries_);
  });
  std::thread tEb([&eb]() { eb.loop(); });
  tEb.join();
  auto fetchTime = (int64_t)duration_cast<milliseconds>(
                       system_clock::now().time_since_epoch())
                       .count();
  columnNames();
  auto columnNamesTime = (int64_t)duration_cast<milliseconds>(
                             system_clock::now().time_since_epoch())
                             .count();
  folly::dynamic results{};

  if (query_.type == "event") {
    // uplink bw request
    results =
        eventHandler(25.6 /* ms for heartbeats */, "alive", MetricType::LINK);
  } else if (query_.type == "uptime_sec") {
    results = eventHandler(1000, "minion_uptime", MetricType::NODE);
  } else if (query_.type == "analyzer_table") {
    results = analyzerTable(30);
  } else if (query_.type == "latest") {
    results = latest();
  } else {
    results = transform();
  }
  auto endTime = (int64_t)duration_cast<milliseconds>(
                     system_clock::now().time_since_epoch())
                     .count();
  LOG(INFO) << "Query completed. "
            << "Query type \"" << query_.type
            << "\" Fetch: " << (fetchTime - startTime) << "ms, "
            << "Column names: " << (columnNamesTime - fetchTime) << "ms, "
            << "Event/Transform: " << (endTime - columnNamesTime) << "ms, "
            << "Total: " << (endTime - startTime) << "ms.";
  return results;
}

int BeringeiData::getShardId(const std::string& key, const int numShards) {
  std::hash<std::string> hash;
  size_t hashValue = hash(key);

  if (numShards != 0) {
    return hashValue % numShards;
  } else {
    return hashValue;
  }
}

void BeringeiData::validateQuery(const query::Query& request) {
  if (request.__isset.min_ago) {
    endTime_ = std::time(nullptr);
    startTime_ = endTime_ - (60 * request.min_ago) + timeInterval_;
    LOG(INFO) << "Start: " << startTime_ << ", End: " << endTime_;
  } else if (request.start_ts != 0 && request.end_ts != 0) {
    // TODO - sanity check time
    startTime_ =
        std::ceil(request.start_ts / (double)timeInterval_) * timeInterval_;
    endTime_ =
        std::ceil(request.end_ts / (double)timeInterval_) * timeInterval_;
    LOG(INFO) << "Start: " << startTime_ << ", End: " << endTime_;
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
            << ", interval: " << timeInterval_;
}

GetDataRequest BeringeiData::createBeringeiRequest(
    const query::Query& request,
    const int numShards) {
  GetDataRequest beringeiRequest;

  beringeiRequest.beginTimestamp = startTime_;
  beringeiRequest.endTimestamp = endTime_;

  for (const auto& keyId : request.key_ids) {
    Key beringeiKey;
    beringeiKey.key = std::to_string(keyId);
    // everything is shard 0 on the writer side
    beringeiKey.shardId = 0;
    beringeiRequest.keys.push_back(beringeiKey);
  }

  return beringeiRequest;
}
} // namespace gorilla
} // namespace facebook
