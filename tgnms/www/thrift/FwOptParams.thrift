namespace cpp facebook.terragraph.thrift
namespace py terragraph_thrift.FwOptParams

// Firmware configuration parameters
// Note: All params may be configured as a part of node init. Params that
//       are marked as a "per-link param", may be further overridden at
//       the initiator during association.
struct FwOptParams {

  // Definition: Enum to choose between different RF antennas supported
  // Values: 0: Use BRCM codebook (unsupported)
  //         1: Use FB codebook
  // Default: 1
  1:  optional i64 antCodeBook;

  // Definition: Only used with static BW handler, for bandwidth allocation
  // between a predetermined fixed number of nodes
  // Values: [1:7]
  // Default: 1
  4:  optional i64 numOfPeerSta;

  // Definition: [Debug only] Param to set output on GPIO for open board debug.
  // (Unsupported on EVT_2.0)
  // Values: 0: MAC scheduler debug [[ TODO: what is this? ]]
  //         1: Air Tx/Rx mode
  //         2: Tx beam read
  //         3: Rx beam read
  // Default: 0
  7:  optional i64 gpioConfig;

  // Definition: [per-link param] MCS used on all links if initial and dynamic
  // link adaptation is disabled [[ TODO: per-link only? additional details? ]]
  // Values: [1:12,34,35]
  // Default: 35
  10: optional i64 mcs;

  // Definition: [per-link param] Transmit power in 0.25 dBm step
  // Values: [-20:2]*4
  // Default: 0
  // [[ TODO: Seems inconsistent ]]
  11: optional i64 txPower;

  // Definition: [per-link param] Block-ack receive window size
  // Values: 8:63, but only 63 supported
  // Default: 63
  12: optional i64 rxBuffer;

  // Definition: [per-link param] Enum indicating beam forming mode
  // Values: 0: Use BRCM defaults (not recommended)
  //         1: Use [tx|rx]BeamIndex specified in cfg file
  //         2: Use indices from the BF scan
  // Default: 2
  // [[ TODO: Per-link only? ]]
  13: optional i64 beamConfig;

  // Definition: [per-link param] The index of the Tx Beam when beamConfig
  //             param is set to "1"
  // Values: [0:63]
  // Default: NA
  14: optional i64 txBeamIndex;

  // Definition: [per-link param] The index of the Rx Beam when beamConfig
  //             param is set to "1"
  // Values: [0:63]
  // Default: NA
  15: optional i64 rxBeamIndex;

  // Definition: Count of consecutive number of HBs that if lost will
  //             cause the link to be declared as a failure. Note: A HB is
  //             sent once every BWGD
  // Values: [1:10000]
  // Default: 10
  18: optional i64 numOfHbLossToFail;

  // Definition: Periodicity (in ms) for logging of stats
  // Values: [200:3600000]
  // Default: 635
  19: optional i64 statsLogInterval;

  // Definition: Periodicity (in ms) for printing of per-station stats
  //             to kernel-log
  // Values: 0: Disable
  //         [200:3600000]: Enable
  // Default: 1024
  20: optional i64 statsPrintInterval;

  // Definition: Boolean to prevent GPS sync check at initiator during assoc
  // Values: 0: Enable GPS
  //         1: Disable GPS
  // Default: 0
  21: optional i64 forceGpsDisable;

  // Definition: Timeout (in ms) on reception of Assoc Resp at initiator
  // Values: [10:60000]
  // Default: 500
  22: optional i64 lsmAssocRespTimeout;

  // Definition: Max number of retries by initiator when waiting for Assoc Resp
  // Values: [0:100]
  // Default: 5
  23: optional i64 lsmSendAssocReqRetry;

  // Definition: Timeout (in ms) on reception of Assoc Resp Ack at responder
  // Values: [10-60000]
  // Default: 500
  24: optional i64 lsmAssocRespAckTimeout;

  // Definition: Max number of retries by initiator when waiting for Assoc Resp
  // Values: [0:100]
  // Default: 5
  25: optional i64 lsmSendAssocRespRetry;

  // Definition: Interval (in ms) between retransmissions of Assoc Resp Ack
  //             by initiator
  // Values: [10:500]
  // Default: 50
  26: optional i64 lsmRepeatAckInterval;

  // Definition: Number of retransmissions of Assoc Resp Ack
  // Values: [1:10]
  // Default: 1
  27: optional i64 lsmRepeatAck;

  // Definition: Wait time (in ms) for first heartbeat after completion of
  //             association procedure
  // Values: [100:1000]
  // Default: 260
  28: optional i64 lsmFirstHeartbTimeout;

  // Definition: Time (in us) from start of frame to start of Tx slot 0
  // Values: [1:399], but only default supported
  // Default: 2
  29: optional i64 txSlot0Start;

  // Definition: Time (in us) from start of frame to end of Tx slot 0
  // Values: [1:399], but only default supported
  // Default: 86
  30: optional i64 txSlot0End;

  // Definition: Time (in us) from start of frame to start of Tx slot 1
  // Values: [1:399], but only default supported
  // Default: 96
  31: optional i64 txSlot1Start;

  // Definition: Time (in us) from start of frame to end of Tx slot 1
  // Values: [1:399], but only default supported
  // Default: 177
  32: optional i64 txSlot1End;

  // Definition: Time (in us) from start of frame to start of Tx slot 2
  // Values: [1:399], but only default supported
  // Default: 187
  33: optional i64 txSlot2Start;

  // Definition: Time (in us) from start of frame to end of Tx slot 2
  // Values: [1:399], but only defauult supported
  // Default: 192
  34: optional i64 txSlot2End;

  // Definition: Time (in us) from start of frame to start of Rx slot 0
  // Values: [1:399], but only default supported
  // Default: 0
  35: optional i64 rxSlot0Start;

  // Definition: Time (in us) from start of frame to end of Rx slot 0
  // Values: [1:399], but only default supported
  // Default: 86
  36: optional i64 rxSlot0End;

  // Definition: Time (in us) from start of frame to start of Rx slot 1
  // Values: [1:399], but only default supported
  // Default: 94
  37: optional i64 rxSlot1Start;

  // Definition: Time (in us) from start of frame to end of Rx slot 1
  // Values: [1:399], but only default supported
  // Default: 177
  38: optional i64 rxSlot1End;

  // Definition: Time (in us) from start of frame to start of Rx slot 2
  // Values: [1:399], but only default supported
  // Default: 185
  39: optional i64 rxSlot2Start;

  // Definition: Time (in us) from start of frame to end of Rx slot 2
  // Values: [1:399], but only default supported
  // Default: 192
  40: optional i64 rxSlot2End;

  // Definition: [per-link param] AGC to use in Data Slots.
  // Values: 33279: Use free running AGC
  //         [?]  : Max or Freeze AGC
  // Default: 33279
  42: optional i64 linkAgc;

  // Definition: [per-link only param] Node type of the responder
  // Values: 1: CN
  //         2: DN
  // Default: 1
  43: optional i64 respNodeType;

  // Definition: [per-link config] GolayIdx use by phy layer for Tx.
  //             Currently unsupported
  // Values: [0-7]
  // Default: 0
  44: optional i64 txGolayIdx;

  // Definition: [per-link config] GolayIdx in use by phy layer for Rx.
  //             Currently unsupported
  // Values: [0-7]
  // Default: 0
  45: optional i64 rxGolayIdx;

  // Definition: AGC to use in BF Slots
  // Values: 33279: Use free running AGC
  //         [?]  : Max or Freeze AGC
  // Default: 33279
  46: optional i64 bfAgc;

  // Definition: [per-link config] tpcEnable to enable Transmit Power Control
  // Values: 0 - Disable
  //         1 - after initial BF only
  //         2 - after initial BF and assoc
  //         3 - after initial BF, assoc, and steady-state
  // Default: 3
  47: optional i64 tpcEnable;

  // Definition: [per-link config] tpcRefRssi
  // Values: [-60 to 60]
  // Default: -36
  48: optional i64 tpcRefRssi;

  // Definition: [per-link config] tpcRefStfSnr1
  // Values: [-20 to 40]
  // Default: 20
  49: optional i64 tpcRefStfSnrStep1;

  // Definition: [per-link config] tpcRefStfSnr2
  // Values: [-20 to 40]
  // Default: 17
  50: optional i64 tpcRefStfSnrStep2;

  // Definition: [per-link config] tpcDelPowerStep1
  // Values:
  // Default: 10
  51: optional i64 tpcDelPowerStep1;

  // Definition: [per-link config] tpcDelPowerStep2
  // Values: [-20 to 40]
  // Default: 8
  52: optional i64 tpcDelPowerStep2;

  // Definition: Enum to choose between different beamforming modes
  // Values: 0: Disable BF scan
  //         1: Enable initial BF scan
  // Default: 1
  53: optional i64 bfMode;

  // Definition: Enum to choose between different bandwidth handler modes
  // Values: 0: Deterministic BW handler
  //         1: Static BW handler
  //         2: Dynamic BW handler
  // Default: 2
  54: optional i64 bwHandlerMode;

  // Definition: [per-link config] tpcRefStfSnr3
  // Values: [-20 to 40]
  // Default: 14
  55: optional i64 tpcRefStfSnrStep3;

  // Definition: [per-link config] tpcDelPowerStep3
  // Values: [-20 to 40]
  // Default: 1
  56: optional i64 tpcDelPowerStep3;

  // Definition: [per-link config] minTxPower
  // step3 when TPC is running, the power index will not go below this value
  // Values: [0 - 31]
  // Default: 0
  57: optional i64 minTxPower;

  // Definition: TPC step 3 (steady state) tpcAlphaXXXRssiStep3Q10 controls how
  // quickly the algorithm tracks the RSSI, a larger value means it tracks more
  // slowly
  // AlphaUp controls how quickly the RSSI is allowed to increase AlphaDown
  // controls how quickly the RSSI is allowed to decrease setting AlphaUp >
  // AlphaDown will allow the RSSI to decrease more quickly than increase which
  // is a conservative setting
  // Values: [0-1] in Q10 notation
  // Default: AlphaUp is .995
  //          AlphaDown is 0.75
  58: optional i64 tpcAlphaDownRssiStep3Q10;
  59: optional i64 tpcAlphaUpRssiStep3Q10;

  // Definition: PER target is 1/laInvPERTarget - for example, for 1e-3 PER
  // target set laInvPERTarget to 1000
  // Values: [10-1000]
  // Default: 200
  60: optional i64 laInvPERTarget;

  // Definition: laConvergenceFactordBperSFQ8 controls how quickly the outer
  // loop offset (in dB) will change, for reference, setting the value to 1
  // (256) means 1dB/SF when the packet size is 5000 bytes assuming a TDD duty
  // cycle of 1/2; a larger laConvergenceFactordBperSFQ8 means faster changes
  // in the offset; default is 256 (1dB)
  // Values: [0.1-1]dB in Q8 notation
  // Default: 1dB in Q8 notation
  61: optional i64 laConvergenceFactordBperSFQ8;

  // Definition: When link adaptation is enabled, the algorithm will not allow
  // the MCS to go outside the range laMinMcs:laMaxMcs
  // if LA is not enabled, the MCS that is set will be applied regardless
  // of laMinMcs or laMaxMcs
  // Values: [1-12]
  // Default: 2, 12 (min, max)
  62: optional i64 laMaxMcs;
  63: optional i64 laMinMcs;

  // Definition: maxAgcTrackingMargindB is the amount by which the max AGC is
  // set higher than the AGC that corresponds to the current IIR averaged rssi
  // the larger this value, the more conservative in terms of the max AGC
  // causing PER but the less effective the AGC will be to combat early-weak
  // interference
  // Values: [0-50]dB
  // Default: 7dB
  64: optional i64 maxAgcTrackingMargindB;

  // Definition: if not enabled, max AGC will be set according to linkAgc -
  // otherwise, linkAgc will be overwritten as soon as the max AGC tracking
  // algorithm
  // starts
  // Values: 0 - Disabled
  //         1 - Enabled
  // Default: 1
  65: optional i64 maxAgcTrackingEnabled;

  // Definition: if no link is up for timeout minutes, fw will mark itself as
  // not healthy this will lead to minion restart
  // Values: [1, 30000] (units = minutes)
  // Default:
  66: optional i64 noLinkTimeout;

  // Definition: if wsecEnable == 1, wgc_bh_config_wsec() is called with this
  // cfg
  // Values: 0 - Disabled
  //         1 - Enabled
  // Default: ?
  67: optional i64 wsecEnable;

  // Definition: key0...3 are used at as args to wgc_bh_add_sta()
  68: optional i64 key0;
  69: optional i64 key1;
  70: optional i64 key2;
  71: optional i64 key3;

  // Definition: Control superframe for the link
  // Values: 0-7 & 255(auto), DN:0-1, CN:1-7, Auto-assign by fw: 255
  // Default: 255 (auto-assign)
  72: optional i64 controlSuperframe;

  // Definition: TPC step 3 (steady state) tpcAlphaXXXTargetRssiStep3Q10
  // controls how quickly the algorithm tracks the target RSSI, a larger value
  // means it tracks more slowly AlphaUp controls how quickly the target RSSI
  // is allowed to increase AlphaDown controls how quickly the target RSSI is
  // allowed to decrease setting AlphaUp < AlphaDown will allow the target RSSI
  // to increase more quickly than decrease which is a conservative setting
  // Values: [0-1] in Q10 notation
  // Default: 0.75 in Q10 notation
  73: optional i64 tpcAlphaUpTargetRssiStep3Q10;

  // Definition: threshold used to detect packets
  // Values: 8-32
  // Default: 24
  74: optional i64 crsScale;

  // Definition: see tpcAlphaUpTargetRssiStep3Q10
  // Values: [0-1] in Q10 notation
  // Default: 0.995 in Q10 notation
  75: optional i64 tpcAlphaDownTargetRssiStep3Q10;

  // Definition: [Deprecated - used by old TPC algorithm] Vhysteresis prevents
  // the txPower from changing unless the calculated change exceeds +/- the
  // hysteresis
  // Values: [0-4] dB in Q2 notation
  // Default: 1dB
  76: optional i64 tpcHysteresisdBStep3Q2;

  // Definition: Flag to enable/disable programming of measurement slots
  // Values: [0-1] 0 - Disable, 1 - Enable
  // Default: 0
  77: optional i64 measSlotEnable;

  // Definition: Measurement slot cycle repetition period (in BWGD units)
  // Values:
  // Default: 8
  78: optional i64 measSlotPeriod;

  // Definition: [per-link config] BWGD offset of measurement slot for the link
  // Values: [0 to (measSlotPeriod - 1)]
  // Default:
  79: optional i64 measSlotOffset;

  // Definition: The LA TPC joint algorithm will adjust the offset using LDPC
  // iterations if latpcUseIterations is set
  // Values: 0 - Disabled
  //         1 - Enabled
  // Default: 1
  80: optional i64 latpcUseIterations;

  // Definition: [per-link config] maxTxPowerIndex
  // step3 when TPC is running, the power index will not go above this value
  // Values: [0 - 31]
  // Default: 28
  81: optional i64 maxTxPower;

  // Definition: Node polarity
  // Values:
  // Default:
  82: optional i64 polarity;

  // Flag to enable/disable link impairment detection
  83: optional i64 linkImpairmentDetectionEnable;

  //Time a link has to stay in SHORTLINKPENDINGTIME before move to SHORT_LINK_UP
  // Unit is SF, 1.6ms
  84: optional i64 linkImpairmentShortPending;

  // Time a link has to stay in SHORTLINKUPTIME before move to LINK_UP
  // Unit is SF, 1.6ms
  85: optional i64 linkImpairmentShortUp;

  // Time a link has to stay in LONGLINKPENDINGTIME before move to LINK_UP
  // Unit is SF, 1.6ms
  86: optional i64 linkImpairmentLongPending;
}

// Firmware configuration parameters for a node
struct NodeFwParams {
  // optional parameters for node init
  1: FwOptParams nodeInitOptParams;
  // optional parameters for a link incident with this node
  2: FwOptParams linkOptParams;
}
