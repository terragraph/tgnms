/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "TimeWindowAggregator.h"

#include "BeringeiClientStore.h"

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/beringei_data_types_custom_protocol.h"
#include "beringei/lib/TimeSeries.h"

#include <folly/io/async/AsyncTimeout.h>

// How frequently to run aggregation + the destination interval.
DEFINE_int32(aggregation_interval,
             60 * 15 /* 15 minutes */,
             "Aggregation interval");
DEFINE_int32(source_bucket_interval,
             30 /* seconds */,
             "Bucket interval/window to query from");
// BUCKET_FINALIZE_SEC in docker config for the destination interval
DEFINE_int32(source_bucket_size,
             3600 /* 1 hour */,
             "Bucket aggregation size (seconds) for source data");
DEFINE_int32(source_bucket_finalize_seconds,
             120, /* 2 minutes */
             "Extra delay to account for bucket finalization time in beringei");
DEFINE_bool(write_time_aggregated_data,
            true,
            "Write aggregator data to beringei");
DEFINE_int32(num_subshards,
             100,
             "Number of subshards to use for dividing shard scans");
using apache::thrift::FRAGILE;
using std::chrono::duration_cast;
using std::chrono::seconds;
using std::chrono::system_clock;

namespace facebook {
namespace gorilla {

TimeWindowAggregator::TimeWindowAggregator() {
  // stats reporting time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  // start aggregation quickly on start-up
  time_t delay = getNextIntervalDelay();
  LOG(INFO) << "Scheduling initial run in " << delay << " seconds";
  timer_->scheduleTimeout(delay * 1000);
}

time_t TimeWindowAggregator::getNextIntervalDelay() {
  time_t nowInSeconds = duration_cast<seconds>(
      system_clock::now().time_since_epoch())
      .count();
  time_t nextIntervalInSeconds =
      std::ceil((double)nowInSeconds / FLAGS_aggregation_interval)
        * FLAGS_aggregation_interval;
  return nextIntervalInSeconds > nowInSeconds ?
      (nextIntervalInSeconds - nowInSeconds) : 0;
}

void TimeWindowAggregator::timerCb() {
  LOG(INFO) << "Running time window aggregation for source window: "
            << FLAGS_source_bucket_interval << "s, dest window: "
            << FLAGS_aggregation_interval << "s";
  timer_->scheduleTimeout(FLAGS_aggregation_interval * 1000);
  // time aggregate eventbase
  folly::EventBase eb;
  eb.runInLoop([this]() mutable {
    auto beringeiClientStore = BeringeiClientStore::getInstance();
    auto beringeiReadClient = beringeiClientStore->getReadClient(
        FLAGS_source_bucket_interval);
    auto beringeiWriteClient = beringeiClientStore->getWriteClient(
        FLAGS_aggregation_interval);
    time_t nowInSeconds = duration_cast<seconds>(
        system_clock::now().time_since_epoch())
        .count();
    // align to the destination interval by calculating the beginning of the
    // interval that will be finalized based on the bucket size
    // (BUCKET_FINALIZE_SEC in docker config)
    time_t curIntervalFloor =
        std::floor(nowInSeconds / FLAGS_aggregation_interval)
          * FLAGS_aggregation_interval
          - FLAGS_source_bucket_size
          - FLAGS_source_bucket_finalize_seconds;
    LOG(INFO) << "Querying for "
              << (curIntervalFloor - FLAGS_aggregation_interval)
              << " (" << (nowInSeconds -
                (curIntervalFloor - FLAGS_aggregation_interval)) << "s ago)"
              << " <-> " << curIntervalFloor << " ("
              << (nowInSeconds - curIntervalFloor) << "s ago)";
    for (int i = 0; i < FLAGS_num_subshards; i++) {
      std::vector<DataPoint> aggRows{};
      ScanShardRequest shardScanRequest(FRAGILE,
          0, /* shardId */
          curIntervalFloor - FLAGS_aggregation_interval, /* beginTimestamp */
          curIntervalFloor, /* endTimestamp */
          i, /* subshard */
          FLAGS_num_subshards /* numSubshards */);
      ScanShardResult shardScanResult{};
      beringeiReadClient->scanShard(shardScanRequest, shardScanResult);
      VLOG(2) << "scanShard: " << i << "/" << FLAGS_num_subshards
              << ", status: "
              << _StatusCode_VALUES_TO_NAMES.at(shardScanResult.status);
      if (shardScanResult.status != StatusCode::OK) {
        continue;
      }
      // read results
      for (int keyIdx = 0; keyIdx < shardScanResult.keys.size(); keyIdx++) {
        double sum = 0;
        int count = 0;
        for (const auto& block : shardScanResult.data[keyIdx]) {
          std::vector<TimeValuePair> keyResults;
          // parse binary data into time series
          TimeSeries::getValues(
              block,
              keyResults,
              shardScanRequest.beginTimestamp,
              shardScanRequest.endTimestamp);
          for (const auto& ts : keyResults) {
            // add any real (non-NaN) data
            if (!std::isnan(ts.value)) {
              sum += ts.value;
              count++;
            }
          }
        }
        // aggregate as long as there is 1 or more data points in the interval
        if (count > 0) {
          double avg = sum / count;
          Key aggKey(FRAGILE,
                     shardScanResult.keys[keyIdx], /* key name */
                     0 /* shardId */);
          TimeValuePair timePair(FRAGILE, curIntervalFloor, avg);
          DataPoint aggRow(FRAGILE, aggKey, timePair, 0);
          aggRows.push_back(aggRow);
        }
      }
      if (FLAGS_write_time_aggregated_data) {
        VLOG(2) << "\tWriting " << aggRows.size()
                << " keys with data for sub-shard " << i
                << "/" << FLAGS_num_subshards;
        auto pushedPoints = beringeiWriteClient->putDataPoints(aggRows);
        if (!pushedPoints) {
          LOG(ERROR) << "\tFailed to perform the put for sub-shard "
                     << i << "/" << FLAGS_num_subshards;
        }
      }
      aggRows.clear();
    }
  });
  std::thread tEb([&eb]() { eb.loop(); });
  tEb.join();
  LOG(INFO) << "Finished running time window aggregation for source window: "
            << FLAGS_source_bucket_interval << "s, dest window: "
            << FLAGS_aggregation_interval << "s";
}

void TimeWindowAggregator::start() {
  eb_.loopForever();
}

} // namespace gorilla
} // namespace facebook
