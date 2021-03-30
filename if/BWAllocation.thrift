# Copyright (c) 2014-present, Facebook, Inc.
namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.BWAllocation

typedef i16 LinkId
typedef i16 SlotIdx

enum SlotAttrib {
  UNRSVD_SLOT = 0,
  BF_RSVD_SLOT = 1,
  MGMT_RSVD_SLOT = 2,
}

struct SlotInfo {
  1: LinkId id;
  2: SlotAttrib attrib;
}

struct NodeBwAlloc {
  1: i16 frmCfgType;                   // Frame configuration type
  2: i16 sframesPerBWGD;               // No. superframes per BWGD
  3: i16 slotsPerFrame;                // No. slots per TDD frame (Tx/Rx)
  4: map<LinkId, string> macAddrList;  // Link ID --> MAC Addr map
  5: map<SlotIdx, SlotInfo> txSlotMap; // Tx slot map
  6: map<SlotIdx, SlotInfo> rxSlotMap; // Rx slot map
}

struct NetworkBwAlloc {
  1: map<string, NodeBwAlloc> nodeBwAllocMap;  // keyed on node name
}

/**
 * @apiDefine LinkAirtime_SUCCESS
 * @apiSuccess (:LinkAirtime) {String} macAddress
 *                            The MAC address of the link
 * @apiSuccess (:LinkAirtime) {Int16} txIdeal
 *                            The ideal TX airtime to the link (in 1/100%)
 * @apiSuccess (:LinkAirtime) {Int16} txMin
 *                            The minimum TX airtime to the link (in 1/100%)
 * @apiSuccess (:LinkAirtime) {Int16} txMax
 *                            The maximum TX airtime to the link (in 1/100%)
 * @apiSuccess (:LinkAirtime) {Int16} rxIdeal
 *                            The ideal RX airtime from the link (in 1/100%)
 * @apiSuccess (:LinkAirtime) {Int16} rxMin
 *                            The minimum RX airtime from the link (in 1/100%)
 * @apiSuccess (:LinkAirtime) {Int16} rxMax
 *                            The maximum RX airtime from the link (in 1/100%)
 */
struct LinkAirtime {
  1: string macAddress; // MAC address of the link
  2: i16 txIdeal;       // Ideal TX airtime to link. Unit: 1/100%.
  3: i16 txMin;         // Min TX airtime to link. Unit: 1/100%.
  4: i16 txMax;         // Max TX airtime to link. Unit: 1/100%.
  5: i16 rxIdeal;       // Ideal RX airtime from link. Unit: 1/100%.
  6: i16 rxMin;         // Min RX airtime from link. Unit: 1/100%.
  7: i16 rxMax;         // Max RX airtime from link. Unit: 1/100%.
}

/**
 * @apiDefine NodeAirtime_SUCCESS
 * @apiSuccess (:NodeAirtime) {Object(LinkAirtime)[]} linkAirtimes
 *             The airtimes for each peer DN and peer CN
 */
struct NodeAirtime {
  1: list<LinkAirtime> linkAirtimes; // for each peer DN and peer CN.
}

/**
 * @apiDefine NetworkAirtime_SUCCESS
 * @apiSuccess {Map(String:Object(NodeAirtime))} nodeAirtimeMap
 *             The network airtime map (node name -> airtimes)
 */
struct NetworkAirtime {
  1: map<string, NodeAirtime> nodeAirtimeMap;  // keyed on node name
}
