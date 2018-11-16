/**
 * Copyright (c) 2018-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "ScanRespService.h"

#include "ApiServiceClient.h"
#include "MySqlClient.h"
#include "TopologyStore.h"

#include <curl/curl.h>
#include <folly/String.h>
#include <folly/io/async/AsyncTimeout.h>
#include <folly/json.h>
#include <thrift/lib/cpp/util/ThriftSerializer.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>

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

using apache::thrift::SimpleJSONSerializer;

using namespace facebook::terragraph::thrift;

namespace facebook {
namespace gorilla {

ScanRespService::ScanRespService(
    std::shared_ptr<ApiServiceClient> apiServiceClient)
    : apiServiceClient_(apiServiceClient) {
  // stats reporting time period
  timer_ = folly::AsyncTimeout::make(eb_, [&]() noexcept { timerCb(); });
  timer_->scheduleTimeout(FLAGS_scan_poll_period_short * 1000);
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
    auto topology = topologyConfig.second->topology;
    if (!topology.name.empty() && !topology.nodes.empty() &&
        !topology.links.empty()) {
      const auto idRange = getScanRespIdRange(topology.name);
      ScanStatus scanStatus =
          apiServiceClient_->fetchApiService<ScanStatus>(
              topologyConfig.second,
              folly::toJson(idRange),
              "api/getScanStatus");
      VLOG(2) << "Received " << scanStatus.scans.size()
              << " scan responses from " << topology.name;
      // if we read the max number of scans on any topology, use the shorter
      // poll period, otherwise, use the longer poll period
      if ((scanStatus.scans.size() == FLAGS_max_num_scans_req) ||
          (idRange["respIdFrom"] == 0 && scanStatus.scans.size() == 1)) {
        scanPollPeriod = FLAGS_scan_poll_period_short;
      }

      int errCode;
      try {
        errCode = writeData(scanStatus, topology.name);
      } catch (const std::exception& ex) {
        LOG(ERROR) << "Error writing scan response to mySQL: "
                   << folly::exceptionStr(ex);
      }
      if (errCode < 0) {
        LOG(ERROR) << "writeData returned an error code = " << errCode;
      } else {
        setNewScanRespId(scanStatus, topology.name);
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

// each row in the mySQL table corresponds to one tx and one rx node
// if a scan has multiple responders, they are each a separate row in the table
// all having the same token and start_bwgd
int ScanRespService::writeData(
    const ScanStatus& scanStatus,
    const std::string& topologyName) {
  std::vector<scans::MySqlScanResp> mySqlScanResponses;
  auto mySqlClient = MySqlClient::getInstance();
  // loop over scans: {token: ScanData}
  for (const std::pair<int, ScanData>& scan : scanStatus.scans) {
    int respId = scan.second.respId;
    if (respId == 0) {
      LOG(ERROR) << "No response ID available for scan token " << scan.first;
      continue;
    }
    int64_t startBwgdIdx = scan.second.startBwgdIdx;

    // if this BWGD comes before the last one in the table at startup,
    // then this is a duplicate entry - skip it; prevents startup problems
    if (startBwgdIdx <= lastBwgdAtStartup_[topologyName]) {
      LOG(INFO) << "[" << topologyName << "] Scan with respId " << respId
                << " skipped -- duplicate.";
      continue;
    }

    std::string txNodeName = scan.second.txNode;

    // write the result only if there is a response from the transmitter and
    // at least one receiver (the normal case)
    int txResponseCount = 0;
    int rxResponseCount = 0;
    for (const auto& responses : scan.second.responses) {
      if (responses.first.compare(txNodeName) == 0) {
        txResponseCount++;
      } else if (!responses.second.routeInfoList.empty()) {
        // at least one of the receivers should have a non-empty response
        rxResponseCount++;
      }
    }
    if (!txResponseCount || (!rxResponseCount &&
        scan.second.type != ScanType::TOPO)) {
      LOG(INFO) << "[" << topologyName << "] Scan with respId " << respId
                << " skipped -- tx missing or rx all empty.";
      continue;
    }

    scans::MySqlScanResp mySqlScanResponse;

    // these fields apply to all scan responses with the same scan ID
    scans::MySqlScanTxResp mySqlScanTxResponse;
    // combinedStatus indicates a non-zero status (error) - we can get
    // more information by looking at the detailed scan response stored as a
    // blob in MySQL
    mySqlScanTxResponse.combinedStatus =
        scan.second.__isset.nResponsesWaiting ? (1 << INCOMPLETE_RESPONSE) : 0;
    mySqlScanTxResponse.respId = respId;
    mySqlScanTxResponse.startBwgd = startBwgdIdx;
    mySqlScanTxResponse.applyFlag = scan.second.apply;
    mySqlScanTxResponse.scanType = (int16_t)scan.second.type;
    mySqlScanTxResponse.scanSubType = (int16_t)scan.second.subType;
    mySqlScanTxResponse.scanMode = (int16_t)scan.second.mode;
    mySqlScanTxResponse.token = scan.first;

    std::vector<scans::MySqlScanRxResp> mySqlScanRxResponses;
    // loop over scan responses within a scan {nodeName:: ScanResp}
    for (const std::pair<std::string, ScanResp>& responses :
         scan.second.responses) {
      auto nodeId = mySqlClient->getNodeIdFromNodeName(responses.first);
      if (!nodeId) {
        LOG(ERROR) << "Error no node ID corresponding to " << responses.first;
        continue;
      }
      // check if this is the tx or an rx node
      if (responses.first.compare(txNodeName) == 0) {
        // this is the tx node
        mySqlScanTxResponse.txNodeId = *nodeId;
        mySqlScanTxResponse.status = responses.second.status;
        mySqlScanTxResponse.txPower = responses.second.txPwrIndex;
        mySqlScanTxResponse.combinedStatus =
            (responses.second.status != ScanFwStatus::COMPLETE)
            << TX_ERROR;
        mySqlScanTxResponse.network = topologyName;
        mySqlScanTxResponse.txNodeName = responses.first;
        try {
          mySqlScanTxResponse.scanResp =
              SimpleJSONSerializer::serialize<std::string>(responses.second);
        } catch (const std::exception& ex) {
          LOG(ERROR) << "Error deserializing scan responses: "
                     << folly::exceptionStr(ex);
          continue;
        }

      } else { // rx node
        // don't write the rx response if the routeInfoList is empty
        // e.g. in an IM scan, there can be hundreds of nodes with no response
        if (responses.second.routeInfoList.empty()) {
          // note that we checked above to make sure that at least one route
          // is not empty in this scan
          continue;
        }
        scans::MySqlScanRxResp mySqlScanRxResponse;

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

        std::unordered_map<int /* x,y hash */,
            std::pair<int /* routeIndex */, int /* route visited count */>>
              routeInfoMap;
        int routeIndex = 0;

        for (const auto& routeInfo : responses.second.routeInfoList) {
          const int txRoute = routeInfo.route.tx;
          const int rxRoute = routeInfo.route.rx;

          const int hash = createXyHash(txRoute, rxRoute);
          if (routeInfoMap.find(hash) == routeInfoMap.end()) {
            MicroRoute route;
            RouteInfo routeInfoAvgTemp;
            route.tx = txRoute;
            route.rx = rxRoute;
            routeInfoAvgTemp.route = route;
            routeInfoAvgTemp.snrEst = routeInfo.snrEst;

            // don't store the following parameters in the DB
            routeInfoAvgTemp.__isset.rxStart = false;
            routeInfoAvgTemp.__isset.packetIdx = false;
            routeInfoAvgTemp.__isset.sweepIdx = false;
            routeInfoAvgTemp.__isset.postSnr = false;
            routeInfoAvgTemp.__isset.rssi = false;
            routeInfoMap[hash].first = routeIndex;
            routeInfoMap[hash].second = 1;
            scanRespNew.routeInfoList.push_back(routeInfoAvgTemp);
            routeIndex++;
          } else {
            std::pair<int, int>& routeIndexAndCount = routeInfoMap[hash];
            RouteInfo* routeInfoListAvg =
                &scanRespNew.routeInfoList[routeIndexAndCount.first];
            routeIndexAndCount.second++;
            // running average
            routeInfoListAvg->snrEst +=
                (routeInfo.snrEst - routeInfoListAvg->snrEst) /
                routeIndexAndCount.second;
          }
        }

        for (auto& routeInfoAvg : scanRespNew.routeInfoList) {
          // take average and round to 2 decimal places before serializing
          routeInfoAvg.snrEst = floor(routeInfoAvg.snrEst * 100 + 0.5) / 100;
        }

        try {
          mySqlScanRxResponse.scanResp =
              SimpleJSONSerializer::serialize<std::string>(scanRespNew);

        } catch (const std::exception& ex) {
          LOG(ERROR) << "Error serializing responses: "
                     << folly::exceptionStr(ex);
          continue;
        }
        mySqlScanRxResponse.status = responses.second.status;
        mySqlScanRxResponse.rxNodeId = *nodeId;
        mySqlScanRxResponse.rxNodeName = responses.first;
        // new_beam_flag indicates if the beam changed
        mySqlScanRxResponse.newBeamFlag = scan.second.apply &&
                ((scan.second.type == ScanType::PBF) &&
                 (responses.second.azimuthBeam != responses.second.newBeam)) ||
            ((scan.second.type == ScanType::RTCAL) &&
             (responses.second.oldBeam != responses.second.newBeam));
        // one bit per individual node response - so we can query it
        mySqlScanTxResponse.combinedStatus =
            ((responses.second.status != ScanFwStatus::COMPLETE)
             << RX_ERROR);
        mySqlScanRxResponses.push_back(mySqlScanRxResponse);
      }
    }
    mySqlScanResponse.txResponse = mySqlScanTxResponse;
    mySqlScanResponse.rxResponses = mySqlScanRxResponses;
    mySqlScanResponses.push_back(mySqlScanResponse);
  }
  bool success = mySqlClient->writeScanResponses(mySqlScanResponses);
  return success ? 0 : -1;
}

void ScanRespService::start() {
  eb_.loopForever();
}

} // namespace gorilla
} // namespace facebook
