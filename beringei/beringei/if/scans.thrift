/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

namespace cpp2 facebook.gorilla.scans
namespace py facebook.gorilla.scans

// scan responses// transmit and receive beamforming indices of a micro route
enum ScanType {
  PBF = 1,      // Periodic beamforming
  IM = 2,       // Interference measurement
  RTCAL = 3,    // Runtime calibration
  CBF_TX = 4,   // Coordinated beamforming (aka interference nulling), tx side
  CBF_RX = 5,   // Same, rx side
}

// SubType for Runtime Calibration and CBF
enum ScanSubType {
  NO_CAL = 0, // No calibration, init state
  TOP_RX_CAL = 1, // Top Panel, responder Rx cal with fixed intiator Tx beam
  TOP_TX_CAL = 2, // Top Panel, intiator Tx cal with fixed responder Rx beam
  BOT_RX_CAL = 3, // Bot Panel, responder Rx cal with fixed intiator Tx beam
  BOT_TX_CAL = 4, // Bot Panel, intiator Tx cal with fixed responder Rx beam
  VBS_RX_CAL = 5, // Top + Bot, responder Rx cal with fixed intiator Tx beam
  VBS_TX_CAL = 6, // Top + Bot, intiator Tx cal with fixed responder Rx beam
  RX_CBF_AGGRESSOR = 7, // RX Coordinated BF Nulling, Aggressor link
  RX_CBF_VICTIM = 8,    // RX Coordinated BF Nulling, Victim link
  TX_CBF_AGGRESSOR = 9, // TX Coordinated BF Nulling, Aggressor link
  TX_CBF_VICTIM = 10,   // TX Coordinated BF Nulling, Victim link
}

enum ScanMode {
  COARSE = 1,
  FINE = 2,
  SELECTIVE = 3,
}

// Runtime Calibration
enum RTCal {
  NO_CAL = 0, // No calibration, init state
  TOP_RX_CAL = 1, // Top Panel, responder Rx cal with fixed intiator Tx beam
  TOP_TX_CAL = 2, // Top Panel, intiator Tx cal with fixed responder Rx beam
  BOT_RX_CAL = 3, // Bot Panel, responder Rx cal with fixed intiator Tx beam
  BOT_TX_CAL = 4, // Bot Panel, intiator Tx cal with fixed responder Rx beam
  VBS_RX_CAL = 5, // Top + Bot, responder Rx cal with fixed intiator Tx beam
  VBS_TX_CAL = 6, // Top + Bot, intiator Tx cal with fixed responder Rx beam
  RX_CBF_AGGRESSOR = 7, // RX Coordinated BF Nulling, Aggressor link
  RX_CBF_VICTIM = 8,    // RX Coordinated BF Nulling, Victim link
  TX_CBF_AGGRESSOR = 9, // TX Coordinated BF Nulling, Aggressor link
  TX_CBF_VICTIM = 10,   // TX Coordinated BF Nulling, Victim link
  RT_CAL_INVALID = 11,
}

enum ScanFwStatus {
  COMPLETE = 0,
  INVALID_TYPE = 1,
  INVALID_START_TSF = 2,
  INVALID_STA = 3,
  AWV_IN_PROG = 4,
  STA_NOT_ASSOC = 5,
  REQ_BUFFER_FULL = 6,
  LINK_SHUT_DOWN = 7,
  UNKNOWN_ERROR = 8,
}

// json_obj is the entire unedited ScanRespTop as received from the Controller
//  as a (compressed) blob other fields in the table are used for searching
// the mysql table for convenience
struct MySqlScanTxResp {
  1: i32 token;
  2: i32 txNodeId; // numeric id corresponding to the mac_addr
  3: i16 scanType;
  4: i16 scanSubType;
  5: string network; // topology name
  6: bool applyFlag; // flag to instruct responder to apply new beams
  // if there is an error indicated in status, you need to look at the json_obj
  // to see the reason
  // combined_status is a bitmask: bit 0 tx, bits 1... for each rx; 1 is error
  7: i16 combinedStatus;
  8: i64 startBwgd;
  9: i16 scanMode;
  10: i32 status;
  11: i16 txPower;
  12: i32 respId;
  13: string txNodeName;
  14: string scanResp; // json blob containing the entire ScanResp struct
}

struct MySqlScanRxResp {
  1: string scanResp;  // json blob containing the entire ScanResp struct
  2: i32 rxNodeId; // numeric id corresponding to the mac_addr
  3: i32 status;
  4: string rxNodeName;
  5: bool newBeamFlag;
}

struct MySqlScanResp {
  1: MySqlScanTxResp txResponse; // always 1 txResponse
  2: list<MySqlScanRxResp> rxResponses; // for IM scan, can be >1 rxResponse
}


struct MicroRoute {
  1: i16 tx;
  2: i16 rx;
}

// individual micro-route measurement/report
struct RouteInfo {
  1: MicroRoute route; // beamforming indices of micro route
  2: double rssi;      // received signal strength, in dBm
  3: double snrEst;    // measured during the short training field, in dB
  4: double postSnr;    // not valid during a scan - ignore it
  5: i32 rxStart;      // relative arrival time of the packet, in us
  6: byte packetIdx;   // Repeat count of this packet, 0-based
  7: i16 sweepidx; // in case of multiple sweeps, indicates the index
}

struct ScanResp {
   1: i32 token; // token to match request to response
   2: i64 curSuperframeNum; // time-stamp of measurement
   3: list<RouteInfo> routeInfoList; // list of routes
   4: i16 txPwrIndex; // tx power used during scan (tx node only)
   5: i16 azimuthBeam; // before any new beams are applied
   6: i16 oldBeam;  // PBF: the old azimuth beam; RTCAL, VBS and CBF: old phase
   7: i16 newBeam;  // PBF new azimuth beam; RTCAL new phase
   8: i16 numSweeps; //Number of times beams were scanned
   9: i64 startSuperframeNum; // Start of BW Alloc for Scan
   10: i64 endSuperframeNum; // End of BW Alloc for scan
   11: i16 status; // whether it completed normally or not (and why)
   12: i16 sweepStartBeam; // Applicable for selective scan only
   13: i16 sweepEndBeam; // Applicable for selective scan only
}

/**
 * @apiDefine ScanData_SUCCESS
 * @apiSuccess (:ScanData) {Map(String:Object(ScanResp))} responses
 *             The scan responses (node:response)
 * @apiSuccess (:ScanData) {String} txNode The transmitter node
 * @apiSuccess (:ScanData) {Int64} startBwgdIdx
 *             The starting bandwidth grant duration (BWGD) index
 */
// Data collected from a single scan.
// Filled in incrementally, as responses arrive.
struct ScanData {
  1: map<string /* nodename */, ScanResp>
     (cpp.template = "std::unordered_map") responses;
  2: string txNode;
  3: i64 startBwgdIdx;
  4: ScanType type;
  5: ScanSubType subType;
  6: ScanMode mode;
  7: bool apply;
  8: i32 respId;
}

/**
 * @apiDefine ScanStatus_SUCCESS
 * @apiSuccess {Map(Int32:Object(ScanData))} scans The scan data (respId:data)
 */
struct ScanStatus {
  1: map<i32 /* respId */, ScanData> scans;
}
