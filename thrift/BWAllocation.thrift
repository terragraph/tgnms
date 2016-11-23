namespace cpp2 facebook.terragraph.thrift
namespace php CXL_Terragraph
namespace py terragraph_thrift.BWAllocation

typedef i16 LinkId
typedef i16 SlotIdx

enum SlotAttrib {
  UNRSVD_SLOT,
  BF_RSVD_SLOT,
  MGMT_RSVD_SLOT,
}

struct SlotInfo {
  1: LinkId id;
  2: SlotAttrib attrib;
}

struct BwAllocationMap {
  1: i16 frmCfgType;                   // Frame configuration type
  2: i16 sframesPerBWGD;               // No. superframes per BWGD
  3: i16 slotsPerFrame;                // No. slots per TDD frame (Tx/Rx)
  4: map<LinkId, string> macAddrList;  // Link ID --> MAC Addr map
  5: map<SlotIdx, SlotInfo> txSlotMap  // Tx slot map
  6: map<SlotIdx, SlotInfo> rxSlotMap; // Rx slot map
}

struct BwAllocationMapConfigs {
  1: map<string, BwAllocationMap> nodeBwAllocationMaps;  // bwmap keyed on node
}

struct LinkAirtime {
  1: string macAddress; // MAC address of the link
  2: i16 txIdeal;       // Ideal TX airtime to link. Unit: 1/100%.
  3: i16 txMin;         // Min TX airtime to link. Unit: 1/100%.
  4: i16 txMax;         // Max TX airtime to link. Unit: 1/100%.
  5: i16 rxIdeal;       // Ideal RX airtime from link. Unit: 1/100%.
  6: i16 rxMin;         // Min RX airtime from link. Unit: 1/100%.
  7: i16 rxMax;         // Max RX airtime from link. Unit: 1/100%.
}

// Note: This is a per node message for each DN.
struct BwAllocationAirtimeConfig {
  1: list<LinkAirtime> airtimes; // Link airtime for each peer DN and peer CN.
}
