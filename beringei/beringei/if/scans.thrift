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

include "Controller.thrift"

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
  10: Controller.ScanFwStatus status;
  11: i16 txPower;
  12: i32 respId;
  13: string txNodeName;
  14: string scanResp; // json blob containing the entire ScanResp struct
  15: i16 nResponsesWaiting; // Number of nodes we are still expecting a response from
}

struct MySqlScanRxResp {
  1: string scanResp;  // json blob containing the entire ScanResp struct
  2: i32 rxNodeId; // numeric id corresponding to the mac_addr
  3: Controller.ScanFwStatus status;
  4: string rxNodeName;
  5: bool newBeamFlag;
}

struct MySqlScanResp {
  1: MySqlScanTxResp txResponse; // always 1 txResponse
  2: list<MySqlScanRxResp> rxResponses; // for IM scan, can be >1 rxResponse
}
