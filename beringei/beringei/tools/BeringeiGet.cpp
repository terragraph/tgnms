/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "beringei/client/BeringeiClient.h"
#include "beringei/if/gen-cpp2/beringei_data_data.h"
#include "beringei/plugins/BeringeiConfigurationAdapter.h"

#include <chrono>
#include <iostream>
#include <memory>
#include <set>
#include <string>

#include <folly/Conv.h>
#include <folly/init/Init.h>

using namespace facebook;

template <class T>
std::chrono::seconds to_epoch(T tp) {
  return std::chrono::duration_cast<std::chrono::seconds>(
      tp.time_since_epoch());
}

DECLARE_string(beringei_configuration_path);
DEFINE_int32(
    shard_id,
    -1,
    "Override the calculated shard_id. -1 to use the calculated shard.");
DEFINE_int64(
    start_time,
    0,
    "Unix timestamp of the start time to query. 0 means 'now'.");
DEFINE_int64(
    end_time,
    0,
    "Unix timestamp of the end time to query. Must be > --start_time.");
DEFINE_bool(
    beringei_list,
    false,
    "If enable, will print the distribution of the timeseries length by keyId."
    "If not, will do query.");

/*
*  This source file can be used to either read data from Beringei database or
   read the number of keyIds with data entries. Details of the two uses:
   a). beringei get data: same as original BeringeiGet
   How to use, in tty put:
   beringei_get someAwesomeKeyId
  -beringei_configuration_path="/usr/local/beringei/build/beringei_30s.json"
  -shard_id=0 -start_time=1530030000 -end_time=1530040000  -logtostderr
   b). beringei list distribution:
   Mainly used for
      debugging to i. make sure that there is data in the Beringei database.
                   ii. learn the number of keyIds used in the Beringei database.
   How to use, in tty put:
   beringei_get -beringei_list
  -beringei_configuration_path="/usr/local/beringei/build/beringei_30s.json"
  -shard_id=0 -start_time=1530030000 -end_time=1530040000  -logtostderr
*/

int main(int argc, char** argv) {
  gflags::SetUsageMessage("[<options>] <key>");
  folly::init(&argc, &argv, true);

  auto beringeiConfig =
      std::make_shared<gorilla::BeringeiConfigurationAdapter>(true);
  auto beringeiClient =
      std::make_shared<gorilla::BeringeiClient>(beringeiConfig, 1, 0, false);

  if (FLAGS_start_time == 0) {
    FLAGS_start_time =
        to_epoch(std::chrono::system_clock::now() - std::chrono::hours(3))
            .count();
  }
  if (FLAGS_end_time == 0) {
    FLAGS_end_time = to_epoch(std::chrono::system_clock::now()).count();
  }
  LOG(INFO) << "Start time: " << FLAGS_start_time
            << "; End time: " << FLAGS_end_time;

  int shardCount = beringeiClient->getNumShards();
  LOG(INFO) << "Config knows about these read services: ";
  for (const auto& rservice : beringeiConfig->getReadServices()) {
    LOG(INFO) << "  " << rservice;
  }
  LOG(INFO) << "Beringei has " << shardCount << " shards.";

  if (shardCount == 0) {
    LOG(FATAL) << "Shard count can't be zero, though.";
  }

  LOG(INFO) << "Now: " << to_epoch(std::chrono::system_clock::now()).count();

  if (FLAGS_beringei_list && FLAGS_shard_id == -1) {
    LOG(ERROR) << "Beringei shardId is a must for shardScan";
    return 1;
  }

  std::string keyName;
  if (!FLAGS_beringei_list) {
    // Check the conditions for the case of read beringei data base
    if (argc < 2) {
      // Not enough input to read beringei
      gflags::ShowUsageWithFlagsRestrict(argv[0], "beringei");
      return 1;
    }

    keyName = std::string(argv[1]);

    if (FLAGS_shard_id == -1) {
      // If used to read beringei database and no shardId is provided, use
      // the hashed key as shardId
      FLAGS_shard_id = std::hash<std::string>()(keyName) % shardCount;
    }

    LOG(INFO) << "Key is in shardId: " << FLAGS_shard_id;
  }

  gorilla::ScanShardRequest shardRequest;

  shardRequest.shardId = FLAGS_shard_id;
  shardRequest.beginTimestamp = FLAGS_start_time - 1201;
  shardRequest.endTimestamp = FLAGS_end_time - 599;
  shardRequest.subshard = 0;
  shardRequest.numSubshards = 1;

  gorilla::ScanShardResult shardResult;
  beringeiClient->scanShard(shardRequest, shardResult);

  LOG(INFO) << "Get whole shard stats:";
  gorilla::_StatusCodeEnumDataStorage statsCodeEnumData;

  int requestStatus = (int)shardResult.status;
  if (requestStatus > statsCodeEnumData.names.size()) {
    LOG(ERROR) << "Unexpected request status";
  } else {
    LOG(INFO) << "Request status: " << statsCodeEnumData.names[requestStatus];
  }

  LOG(INFO) << "Keys: " << folly::join(", ", shardResult.keys);
  LOG(INFO) << "There are in total " << shardResult.keys.size()
            << " keys on shard " << FLAGS_shard_id;

  if (!FLAGS_beringei_list) {
    // Use BeringeiGet to query data by keyId from Beringei database
    gorilla::GetDataRequest request;
    request.keys.emplace_back();
    request.keys.back().key = keyName;
    request.keys.back().shardId = FLAGS_shard_id;
    request.beginTimestamp = FLAGS_start_time;
    request.endTimestamp = FLAGS_end_time;

    gorilla::GorillaResultVector result;
    beringeiClient->get(request, result);

    for (const auto& keyData : result) {
      const auto& keyName = keyData.first.key;
      for (const auto& timeValue : keyData.second) {
        std::cout << keyName << "\t" << std::to_string(timeValue.value) << "\t"
                  << timeValue.unixTime << std::endl;
      }
    }
  } else {
    // List timeseries distribution.
    // Currently don't apply binning to the timeseries by number of data points.
    // For each length, just count  how many time series have that length.
    // TODO: add binning (FLAGS_num_of_bins) if the timeseries length is very
    // spread.
    std::vector<int> timeSeriesLengths;
    for (const auto& timeSeries : shardResult.data) {
      timeSeriesLengths.push_back(timeSeries.size());
    }

    std::unordered_map<int, int64_t> lengthToCount;
    for (const auto& length : timeSeriesLengths) {
      if (lengthToCount.find(length) == lengthToCount.end()) {
        lengthToCount[length] = 1;
      } else {
        lengthToCount[length]++;
      }
    }

    for (const auto& element : lengthToCount) {
      LOG(INFO) << "There are " << element.second << " keyIds with "
                << element.first << " data points";
    }
  }

  return 0;
}
