/**
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ScanRespService.h"

#include <folly/String.h>
#include <folly/system/ThreadName.h>
#include <folly/io/async/AsyncTimeout.h>
#include <folly/json.h>
#include <snappy.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

#include "ApiServiceClient.h"
#include "MySqlClient.h"
#include "TopologyStore.h"

// times are in seconds
// Short poll period is only used when all requested results are returned
// because this probably means there are more results to fetch.
// The controller will store around 1000-2000 scan results; if the controller
// has been running for a while and we have been offline, we want to fetch them
// quickly.  In steady state, it takes several minutes to run a scan set where
// a scan set is on the order of 10-20 scans.
// Prime numbers for times selected to make it less likely that we always
// overlap with other periodic events unrelated to scans.
DEFINE_int32(
    scan_poll_period_short,
    17,
    "Scan response polling period if results");
DEFINE_int32(
    scan_poll_period_long,
    293,
    "Scan response polling period if no results");
DEFINE_int32(max_num_scans_req, 50, "Maximum number of scans to request");

#define MAX_ROUTE_NUM 256

using apache::thrift::BinarySerializer;
using apache::thrift::SimpleJSONSerializer;

using namespace facebook::terragraph::thrift;

namespace facebook {
namespace gorilla {

ScanRespService::ScanRespService() {
  ebThread_ = std::thread([this]() {
    folly::setThreadName("Scan Response Service");
    this->eb_.loopForever();
  });
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  eb_.runInEventBaseThread([&]() { timerCb(); });
}

ScanRespService::~ScanRespService() {
  ebThread_.join();
}

folly::dynamic ScanRespService::getScanRespIdRange(
    const std::string& topologyName) {
  auto mySqlClient = MySqlClient::getInstance();
  int respIdFrom = 0;
  int respIdTo = 0;

  // if restarting BQS, start reading respId from the beginning
  // mysql table is set so that topology name, BWGD, and token must be unique
  // to prevent duplicates
  auto it = scanRespId_.find(topologyName);
  if (it == scanRespId_.end()) {
    scanRespId_[topologyName] = 0;
    lastBwgdAtStartup_[topologyName] = mySqlClient->getLastBwgd(topologyName);
    LOG(INFO) << "[" << topologyName
              << "] lastBwgdAtStartup_: " << lastBwgdAtStartup_[topologyName];
  }

  if (scanRespId_[topologyName] > 0) {
    respIdFrom = scanRespId_[topologyName] + 1;
    respIdTo = respIdFrom + FLAGS_max_num_scans_req - 1;
  }

  LOG(INFO) << "[" << topologyName << "] Requesting scans from respId "
            << respIdFrom << " to " << respIdTo;
  auto postData =
      folly::dynamic::object("respIdFrom", respIdFrom)("respIdTo", respIdTo);
  return postData;
}

void ScanRespService::timerCb() {
  VLOG(2) << "Timer running; fetching scan response";
  int scanPollPeriod = FLAGS_scan_poll_period_long;
  auto topologyInstance = TopologyStore::getInstance();
  auto topologyList = topologyInstance->getTopologyList();

  for (const auto& topologyConfig : topologyList) {
    VLOG(2) << "Topology: " << topologyConfig.first;
    auto topology = topologyConfig.second->topology_ref();
    if (!topology->name.empty() && !topology->nodes.empty() &&
        !topology->links.empty()) {
      const auto idRange = getScanRespIdRange(topology->name);
      auto scanStatus = ApiServiceClient::makeRequest<ScanStatus>(
          topologyConfig.second->primary_controller.ip,
          topologyConfig.second->primary_controller.api_port,
          "api/getScanStatus",
          folly::toJson(idRange) /* post data */);

      if (!scanStatus) {
        LOG(INFO) << "Failed to fetch scan status for " << topology->name;
        continue;
      }

      VLOG(2) << "Received " << scanStatus->scans.size()
              << " scan responses from " << topology->name;

      // if we read the max number of scans on any topology, use the shorter
      // poll period, otherwise, use the longer poll period
      if ((scanStatus->scans.size() == FLAGS_max_num_scans_req) ||
          (idRange["respIdFrom"] == 0 && scanStatus->scans.size() == 1)) {
        scanPollPeriod = FLAGS_scan_poll_period_short;
      }

      int errCode;
      try {
        errCode = writeData(*scanStatus, topology->name);
      } catch (const std::exception& ex) {
        LOG(ERROR) << "Error writing scan response to mySQL: "
                   << folly::exceptionStr(ex);
      }
      if (errCode < 0) {
        LOG(ERROR) << "writeData returned an error code = " << errCode;
      } else {
        setNewScanRespId(*scanStatus, topology->name);
      }
    }
  }

  timer_->scheduleTimeout(scanPollPeriod * 1000);
}

void ScanRespService::setNewScanRespId(
    const ScanStatus& scanStatus,
    const std::string& topologyName) {
  auto it = std::max_element(
      scanStatus.scans.begin(),
      scanStatus.scans.end(),
      [](std::pair<int, ScanData> a, std::pair<int, ScanData> b) {
        return (a.second.respId < b.second.respId);
      });
  if (it != scanStatus.scans.end()) {
    int respId = it->second.respId;
    if (respId > 0) {
      scanRespId_[topologyName] = respId;
      VLOG(2) << "received " << scanStatus.scans.size()
              << " scan responses; largest respId = "
              << scanRespId_[topologyName];
    } else {
      LOG(ERROR) << "Scan response ID is 0 or not available";
    }
  }
}

// 1. thrift serialize using BinarySerializer
//    (there is bug in javascript thrift with the CompactSerializer DOUBLE)
// 2. compress using Google snappy
// 3. write result as string into the DB
folly::Optional<std::string> ScanRespService::serializeAndCompress(
    const ScanResp& scanResp) {
  std::string serstr;
  try {
    serstr = BinarySerializer::serialize<std::string>(scanResp);
  } catch (const std::exception& ex) {
    LOG(ERROR) << "Error serializing responses: " << folly::exceptionStr(ex);
    return folly::none;
  }
  std::string compstr;
  snappy::Compress(serstr.data(), serstr.size(), &compstr);
  LOG(INFO) << "Snappy compression input size " << serstr.size()
            << "; compressed size " << compstr.size();
  return (folly::Optional<std::string>)compstr;
}

// each row in the mySQL table corresponds to one tx and one rx node
// if a scan has multiple responders, they are each a separate row in the table
// all having the same token and start_bwgd
int ScanRespService::writeData(
    const ScanStatus& scanStatus,
    const std::string& topologyName) {
  std::vector<scans::MySqlScanResp> mySqlScanResponses;
  // loop over scans: {token: ScanData}
  for (const std::pair<int, ScanData>& scan : scanStatus.scans) {
    int respId = scan.second.respId;
    if (respId == 0) {
      LOG(ERROR) << "No response ID available for scan token " << scan.first;
      continue;
    }

    std::string txNodeName = scan.second.txNode;
    if (scan.second.responses.empty()) {
      LOG(INFO) << "[" << topologyName << "] Scan with respId " << respId
                << " has no responses";
    }

    scans::MySqlScanResp mySqlScanResponse{};
    scans::MySqlScanTxResp mySqlScanTxResponse{};
    bool hasTxResponse = false;

    // these fields apply to all scan responses with the same scan ID
    // combinedStatus indicates a non-zero status (error) - we can get
    // more information by looking at the detailed scan response stored as a
    // blob in MySQL
    int nResponsesWaiting = scan.second.nResponsesWaiting_ref()
        ? *scan.second.nResponsesWaiting_ref()
        : 0;
    mySqlScanTxResponse.combinedStatus =
        nResponsesWaiting > 0 ? (1 << INCOMPLETE_RESPONSE) : 0;
    mySqlScanTxResponse.nResponsesWaiting = nResponsesWaiting;
    mySqlScanTxResponse.respId = respId;
    mySqlScanTxResponse.applyFlag = *scan.second.apply_ref();
    mySqlScanTxResponse.scanType = (int16_t)scan.second.type;
    mySqlScanTxResponse.scanSubType = (int16_t)*scan.second.subType_ref();
    mySqlScanTxResponse.scanMode = (int16_t)scan.second.mode;
    mySqlScanTxResponse.token = scan.first;
    *mySqlScanTxResponse.groupId_ref() = *scan.second.groupId_ref();

    std::vector<scans::MySqlScanRxResp> mySqlScanRxResponses;
    bool duplicateScanResp = false;
    // loop over scan responses within a scan {nodeName:: ScanResp}
    for (const std::pair<std::string, ScanResp>& responses :
         scan.second.responses) {
      // check if this is the tx or an rx node
      if (responses.first.compare(txNodeName) == 0) {
        // this is the tx node
        hasTxResponse = true;
        // node id deprecated - rely on mac addr
        mySqlScanTxResponse.txNodeId = 0;
        mySqlScanTxResponse.status = responses.second.status;
        mySqlScanTxResponse.txPower = *responses.second.txPwrIndex_ref();
        mySqlScanTxResponse.combinedStatus =
            (responses.second.status != ScanFwStatus::COMPLETE) << TX_ERROR;
        mySqlScanTxResponse.network = topologyName;
        mySqlScanTxResponse.txNodeName = responses.first;
        int64_t startBwgdIdx = responses.second.curSuperframeNum / 16;
        mySqlScanTxResponse.startBwgd = startBwgdIdx;

        // if this BWGD comes before the last one in the table at startup,
        // then this is a duplicate entry - skip it; prevents startup problems
        if (startBwgdIdx <= lastBwgdAtStartup_[topologyName]) {
          LOG(INFO) << "[" << topologyName << "] Scan with respId " << respId
                    << " skipped -- duplicate.";
          duplicateScanResp = true;
          break;
        }

        // If this tx response is not from a duplicate scan, compress and
        // serialize it
        if (!duplicateScanResp) {
          auto compressedString = serializeAndCompress(responses.second);
          if (compressedString) {
            mySqlScanTxResponse.scanResp = std::move(*compressedString);
          } else {
            mySqlScanTxResponse.scanResp = "Serialize failure in BQS";
          }
        }
      } else { // rx node
        scans::MySqlScanRxResp mySqlScanRxResponse;

        // if the route info list is empty, write an empty response
        if (responses.second.routeInfoList.empty() &&
            scan.second.type != ScanType::TOPO) {
          LOG(INFO) << "[" << topologyName << "] Scan with respId " << respId
                    << " rx node " << responses.first
                    << " had an empty route info list";
          mySqlScanRxResponse.scanResp = "";
        } else {
          // when we receive scan results from the controller, each route is
          // visited multiple times in general; let's store only the average
          // SNR for each route to save space and increase UI speed

          // createXyHash creates a unique hash index for routes
          auto createXyHash = [](const int x, const int y) {
            return x * MAX_ROUTE_NUM + y;
          };

          // calculate the average SNR over all routes
          ScanResp scanRespNew = responses.second; // copy
          scanRespNew.routeInfoList.clear();

          std::unordered_map<
              int /* x,y hash */,
              std::pair<int /* routeIndex */, int /* route visited count */>>
              routeInfoMap;
          int routeIndex = 0;

          // if the response is empty, this loop won't run
          for (const auto& routeInfo : responses.second.routeInfoList) {
            const int txRoute = routeInfo.route.tx;
            const int rxRoute = routeInfo.route.rx;

            const int hash = createXyHash(txRoute, rxRoute);
            if (routeInfoMap.find(hash) == routeInfoMap.end()) {
              routeInfoMap[hash].first = routeIndex;
              routeInfoMap[hash].second = 1;
              scanRespNew.routeInfoList.push_back(routeInfo);
              routeIndex++;
            } else {
              // this route (tx/rx) is already added, so average results
              std::pair<int, int>& routeIndexAndCount = routeInfoMap[hash];
              RouteInfo* routeInfoListAvg =
                  &scanRespNew.routeInfoList[routeIndexAndCount.first];
              routeIndexAndCount.second++;
              // running average
              routeInfoListAvg->snrEst +=
                  (routeInfo.snrEst - routeInfoListAvg->snrEst) /
                  routeIndexAndCount.second;
              routeInfoListAvg->rssi +=
                  (routeInfo.rssi - routeInfoListAvg->rssi) /
                  routeIndexAndCount.second;
              routeInfoListAvg->postSnr +=
                  (routeInfo.postSnr - routeInfoListAvg->postSnr) /
                  routeIndexAndCount.second;
            }
          }

          auto compressedString = serializeAndCompress(scanRespNew);
          if (compressedString) {
            mySqlScanRxResponse.scanResp = std::move(*compressedString);
          } else {
            mySqlScanRxResponse.scanResp = "Serialize failure in BQS";
          }
        }

        mySqlScanRxResponse.status = responses.second.status;
        // node id deprecated - rely on mac addr
        mySqlScanRxResponse.rxNodeId = 0;
        mySqlScanRxResponse.rxNodeName = responses.first;
        // new_beam_flag indicates if the beam changed
        mySqlScanRxResponse.newBeamFlag = *scan.second.apply_ref() &&
                ((scan.second.type == ScanType::PBF) &&
                 (*responses.second.azimuthBeam_ref() != *responses.second.newBeam_ref())) ||
            ((scan.second.type == ScanType::RTCAL) &&
             (*responses.second.oldBeam_ref() != *responses.second.newBeam_ref()));
        // one bit per individual node response - so we can query it
        mySqlScanTxResponse.combinedStatus =
            ((responses.second.status != ScanFwStatus::COMPLETE) << RX_ERROR);
        mySqlScanRxResponses.push_back(mySqlScanRxResponse);
      }
    }
    if (!hasTxResponse) {
      // If no tx response was present in the scan data, add a placeholder for
      // error tracking purposes
      mySqlScanTxResponse.txNodeId = 0; // node id deprecated - rely on mac addr
      mySqlScanTxResponse.txNodeName = txNodeName;
      mySqlScanTxResponse.scanResp = "";
      mySqlScanTxResponse.combinedStatus = 1 << TX_ERROR;
      mySqlScanTxResponse.status = ScanFwStatus::COMPLETE;
      mySqlScanTxResponse.network = topologyName;
      mySqlScanTxResponse.startBwgd = 0;
    }
    if (!duplicateScanResp) {
      mySqlScanResponse.txResponse = mySqlScanTxResponse;
      mySqlScanResponse.rxResponses = mySqlScanRxResponses;
      mySqlScanResponses.push_back(mySqlScanResponse);
    }
  }
  auto mySqlClient = MySqlClient::getInstance();
  bool success = mySqlClient->writeScanResponses(mySqlScanResponses);
  return success ? 0 : -1;
}

} // namespace gorilla
} // namespace facebook
