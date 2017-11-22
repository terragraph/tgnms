//
// Autogenerated by Thrift Compiler
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var Thrift = require('thrift').Thrift;
var ttypes = module.exports = {};
FwOptParams = module.exports.FwOptParams = function(args) {
  this.antCodeBook = null;
  this.numOfPeerSta = null;
  this.gpioConfig = null;
  this.mcs = null;
  this.txPower = null;
  this.rxBuffer = null;
  this.beamConfig = null;
  this.txBeamIndex = null;
  this.rxBeamIndex = null;
  this.numOfHbLossToFail = null;
  this.statsLogInterval = null;
  this.statsPrintInterval = null;
  this.forceGpsDisable = null;
  this.lsmAssocRespTimeout = null;
  this.lsmSendAssocReqRetry = null;
  this.lsmAssocRespAckTimeout = null;
  this.lsmSendAssocRespRetry = null;
  this.lsmRepeatAckInterval = null;
  this.lsmRepeatAck = null;
  this.lsmFirstHeartbTimeout = null;
  this.txSlot0Start = null;
  this.txSlot0End = null;
  this.txSlot1Start = null;
  this.txSlot1End = null;
  this.txSlot2Start = null;
  this.txSlot2End = null;
  this.rxSlot0Start = null;
  this.rxSlot0End = null;
  this.rxSlot1Start = null;
  this.rxSlot1End = null;
  this.rxSlot2Start = null;
  this.rxSlot2End = null;
  this.linkAgc = null;
  this.respNodeType = null;
  this.txGolayIdx = null;
  this.rxGolayIdx = null;
  this.bfAgc = null;
  this.tpcEnable = null;
  this.tpcRefRssi = null;
  this.tpcRefStfSnrStep1 = null;
  this.tpcRefStfSnrStep2 = null;
  this.tpcDelPowerStep1 = null;
  this.tpcDelPowerStep2 = null;
  this.bfMode = null;
  this.bwHandlerMode = null;
  this.tpcRefStfSnrStep3 = null;
  this.tpcDelPowerStep3 = null;
  this.minTxPower = null;
  this.tpcAlphaDownRssiStep3Q10 = null;
  this.tpcAlphaUpRssiStep3Q10 = null;
  this.laInvPERTarget = null;
  this.laConvergenceFactordBperSFQ8 = null;
  this.laMaxMcs = null;
  this.laMinMcs = null;
  this.maxAgcTrackingMargindB = null;
  this.maxAgcTrackingEnabled = null;
  this.noLinkTimeout = null;
  this.wsecEnable = null;
  this.key0 = null;
  this.key1 = null;
  this.key2 = null;
  this.key3 = null;
  this.controlSuperframe = null;
  this.tpcAlphaUpTargetRssiStep3Q10 = null;
  this.crsScale = null;
  this.tpcAlphaDownTargetRssiStep3Q10 = null;
  this.tpcHysteresisdBStep3Q2 = null;
  this.measSlotEnable = null;
  this.measSlotPeriod = null;
  this.measSlotOffset = null;
  this.latpcUseIterations = null;
  this.maxTxPower = null;
  this.polarity = null;
  if (args) {
    if (args.antCodeBook !== undefined) {
      this.antCodeBook = args.antCodeBook;
    }
    if (args.numOfPeerSta !== undefined) {
      this.numOfPeerSta = args.numOfPeerSta;
    }
    if (args.gpioConfig !== undefined) {
      this.gpioConfig = args.gpioConfig;
    }
    if (args.mcs !== undefined) {
      this.mcs = args.mcs;
    }
    if (args.txPower !== undefined) {
      this.txPower = args.txPower;
    }
    if (args.rxBuffer !== undefined) {
      this.rxBuffer = args.rxBuffer;
    }
    if (args.beamConfig !== undefined) {
      this.beamConfig = args.beamConfig;
    }
    if (args.txBeamIndex !== undefined) {
      this.txBeamIndex = args.txBeamIndex;
    }
    if (args.rxBeamIndex !== undefined) {
      this.rxBeamIndex = args.rxBeamIndex;
    }
    if (args.numOfHbLossToFail !== undefined) {
      this.numOfHbLossToFail = args.numOfHbLossToFail;
    }
    if (args.statsLogInterval !== undefined) {
      this.statsLogInterval = args.statsLogInterval;
    }
    if (args.statsPrintInterval !== undefined) {
      this.statsPrintInterval = args.statsPrintInterval;
    }
    if (args.forceGpsDisable !== undefined) {
      this.forceGpsDisable = args.forceGpsDisable;
    }
    if (args.lsmAssocRespTimeout !== undefined) {
      this.lsmAssocRespTimeout = args.lsmAssocRespTimeout;
    }
    if (args.lsmSendAssocReqRetry !== undefined) {
      this.lsmSendAssocReqRetry = args.lsmSendAssocReqRetry;
    }
    if (args.lsmAssocRespAckTimeout !== undefined) {
      this.lsmAssocRespAckTimeout = args.lsmAssocRespAckTimeout;
    }
    if (args.lsmSendAssocRespRetry !== undefined) {
      this.lsmSendAssocRespRetry = args.lsmSendAssocRespRetry;
    }
    if (args.lsmRepeatAckInterval !== undefined) {
      this.lsmRepeatAckInterval = args.lsmRepeatAckInterval;
    }
    if (args.lsmRepeatAck !== undefined) {
      this.lsmRepeatAck = args.lsmRepeatAck;
    }
    if (args.lsmFirstHeartbTimeout !== undefined) {
      this.lsmFirstHeartbTimeout = args.lsmFirstHeartbTimeout;
    }
    if (args.txSlot0Start !== undefined) {
      this.txSlot0Start = args.txSlot0Start;
    }
    if (args.txSlot0End !== undefined) {
      this.txSlot0End = args.txSlot0End;
    }
    if (args.txSlot1Start !== undefined) {
      this.txSlot1Start = args.txSlot1Start;
    }
    if (args.txSlot1End !== undefined) {
      this.txSlot1End = args.txSlot1End;
    }
    if (args.txSlot2Start !== undefined) {
      this.txSlot2Start = args.txSlot2Start;
    }
    if (args.txSlot2End !== undefined) {
      this.txSlot2End = args.txSlot2End;
    }
    if (args.rxSlot0Start !== undefined) {
      this.rxSlot0Start = args.rxSlot0Start;
    }
    if (args.rxSlot0End !== undefined) {
      this.rxSlot0End = args.rxSlot0End;
    }
    if (args.rxSlot1Start !== undefined) {
      this.rxSlot1Start = args.rxSlot1Start;
    }
    if (args.rxSlot1End !== undefined) {
      this.rxSlot1End = args.rxSlot1End;
    }
    if (args.rxSlot2Start !== undefined) {
      this.rxSlot2Start = args.rxSlot2Start;
    }
    if (args.rxSlot2End !== undefined) {
      this.rxSlot2End = args.rxSlot2End;
    }
    if (args.linkAgc !== undefined) {
      this.linkAgc = args.linkAgc;
    }
    if (args.respNodeType !== undefined) {
      this.respNodeType = args.respNodeType;
    }
    if (args.txGolayIdx !== undefined) {
      this.txGolayIdx = args.txGolayIdx;
    }
    if (args.rxGolayIdx !== undefined) {
      this.rxGolayIdx = args.rxGolayIdx;
    }
    if (args.bfAgc !== undefined) {
      this.bfAgc = args.bfAgc;
    }
    if (args.tpcEnable !== undefined) {
      this.tpcEnable = args.tpcEnable;
    }
    if (args.tpcRefRssi !== undefined) {
      this.tpcRefRssi = args.tpcRefRssi;
    }
    if (args.tpcRefStfSnrStep1 !== undefined) {
      this.tpcRefStfSnrStep1 = args.tpcRefStfSnrStep1;
    }
    if (args.tpcRefStfSnrStep2 !== undefined) {
      this.tpcRefStfSnrStep2 = args.tpcRefStfSnrStep2;
    }
    if (args.tpcDelPowerStep1 !== undefined) {
      this.tpcDelPowerStep1 = args.tpcDelPowerStep1;
    }
    if (args.tpcDelPowerStep2 !== undefined) {
      this.tpcDelPowerStep2 = args.tpcDelPowerStep2;
    }
    if (args.bfMode !== undefined) {
      this.bfMode = args.bfMode;
    }
    if (args.bwHandlerMode !== undefined) {
      this.bwHandlerMode = args.bwHandlerMode;
    }
    if (args.tpcRefStfSnrStep3 !== undefined) {
      this.tpcRefStfSnrStep3 = args.tpcRefStfSnrStep3;
    }
    if (args.tpcDelPowerStep3 !== undefined) {
      this.tpcDelPowerStep3 = args.tpcDelPowerStep3;
    }
    if (args.minTxPower !== undefined) {
      this.minTxPower = args.minTxPower;
    }
    if (args.tpcAlphaDownRssiStep3Q10 !== undefined) {
      this.tpcAlphaDownRssiStep3Q10 = args.tpcAlphaDownRssiStep3Q10;
    }
    if (args.tpcAlphaUpRssiStep3Q10 !== undefined) {
      this.tpcAlphaUpRssiStep3Q10 = args.tpcAlphaUpRssiStep3Q10;
    }
    if (args.laInvPERTarget !== undefined) {
      this.laInvPERTarget = args.laInvPERTarget;
    }
    if (args.laConvergenceFactordBperSFQ8 !== undefined) {
      this.laConvergenceFactordBperSFQ8 = args.laConvergenceFactordBperSFQ8;
    }
    if (args.laMaxMcs !== undefined) {
      this.laMaxMcs = args.laMaxMcs;
    }
    if (args.laMinMcs !== undefined) {
      this.laMinMcs = args.laMinMcs;
    }
    if (args.maxAgcTrackingMargindB !== undefined) {
      this.maxAgcTrackingMargindB = args.maxAgcTrackingMargindB;
    }
    if (args.maxAgcTrackingEnabled !== undefined) {
      this.maxAgcTrackingEnabled = args.maxAgcTrackingEnabled;
    }
    if (args.noLinkTimeout !== undefined) {
      this.noLinkTimeout = args.noLinkTimeout;
    }
    if (args.wsecEnable !== undefined) {
      this.wsecEnable = args.wsecEnable;
    }
    if (args.key0 !== undefined) {
      this.key0 = args.key0;
    }
    if (args.key1 !== undefined) {
      this.key1 = args.key1;
    }
    if (args.key2 !== undefined) {
      this.key2 = args.key2;
    }
    if (args.key3 !== undefined) {
      this.key3 = args.key3;
    }
    if (args.controlSuperframe !== undefined) {
      this.controlSuperframe = args.controlSuperframe;
    }
    if (args.tpcAlphaUpTargetRssiStep3Q10 !== undefined) {
      this.tpcAlphaUpTargetRssiStep3Q10 = args.tpcAlphaUpTargetRssiStep3Q10;
    }
    if (args.crsScale !== undefined) {
      this.crsScale = args.crsScale;
    }
    if (args.tpcAlphaDownTargetRssiStep3Q10 !== undefined) {
      this.tpcAlphaDownTargetRssiStep3Q10 = args.tpcAlphaDownTargetRssiStep3Q10;
    }
    if (args.tpcHysteresisdBStep3Q2 !== undefined) {
      this.tpcHysteresisdBStep3Q2 = args.tpcHysteresisdBStep3Q2;
    }
    if (args.measSlotEnable !== undefined) {
      this.measSlotEnable = args.measSlotEnable;
    }
    if (args.measSlotPeriod !== undefined) {
      this.measSlotPeriod = args.measSlotPeriod;
    }
    if (args.measSlotOffset !== undefined) {
      this.measSlotOffset = args.measSlotOffset;
    }
    if (args.latpcUseIterations !== undefined) {
      this.latpcUseIterations = args.latpcUseIterations;
    }
    if (args.maxTxPower !== undefined) {
      this.maxTxPower = args.maxTxPower;
    }
    if (args.polarity !== undefined) {
      this.polarity = args.polarity;
    }
  }
};
FwOptParams.prototype = {};
FwOptParams.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.I64) {
        this.antCodeBook = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I64) {
        this.numOfPeerSta = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.I64) {
        this.gpioConfig = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.I64) {
        this.mcs = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.I64) {
        this.txPower = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.I64) {
        this.rxBuffer = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 13:
      if (ftype == Thrift.Type.I64) {
        this.beamConfig = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 14:
      if (ftype == Thrift.Type.I64) {
        this.txBeamIndex = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 15:
      if (ftype == Thrift.Type.I64) {
        this.rxBeamIndex = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 18:
      if (ftype == Thrift.Type.I64) {
        this.numOfHbLossToFail = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 19:
      if (ftype == Thrift.Type.I64) {
        this.statsLogInterval = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 20:
      if (ftype == Thrift.Type.I64) {
        this.statsPrintInterval = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 21:
      if (ftype == Thrift.Type.I64) {
        this.forceGpsDisable = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 22:
      if (ftype == Thrift.Type.I64) {
        this.lsmAssocRespTimeout = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 23:
      if (ftype == Thrift.Type.I64) {
        this.lsmSendAssocReqRetry = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 24:
      if (ftype == Thrift.Type.I64) {
        this.lsmAssocRespAckTimeout = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 25:
      if (ftype == Thrift.Type.I64) {
        this.lsmSendAssocRespRetry = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 26:
      if (ftype == Thrift.Type.I64) {
        this.lsmRepeatAckInterval = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 27:
      if (ftype == Thrift.Type.I64) {
        this.lsmRepeatAck = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 28:
      if (ftype == Thrift.Type.I64) {
        this.lsmFirstHeartbTimeout = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 29:
      if (ftype == Thrift.Type.I64) {
        this.txSlot0Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 30:
      if (ftype == Thrift.Type.I64) {
        this.txSlot0End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 31:
      if (ftype == Thrift.Type.I64) {
        this.txSlot1Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 32:
      if (ftype == Thrift.Type.I64) {
        this.txSlot1End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 33:
      if (ftype == Thrift.Type.I64) {
        this.txSlot2Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 34:
      if (ftype == Thrift.Type.I64) {
        this.txSlot2End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 35:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot0Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 36:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot0End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 37:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot1Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 38:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot1End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 39:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot2Start = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 40:
      if (ftype == Thrift.Type.I64) {
        this.rxSlot2End = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 42:
      if (ftype == Thrift.Type.I64) {
        this.linkAgc = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 43:
      if (ftype == Thrift.Type.I64) {
        this.respNodeType = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 44:
      if (ftype == Thrift.Type.I64) {
        this.txGolayIdx = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 45:
      if (ftype == Thrift.Type.I64) {
        this.rxGolayIdx = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 46:
      if (ftype == Thrift.Type.I64) {
        this.bfAgc = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 47:
      if (ftype == Thrift.Type.I64) {
        this.tpcEnable = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 48:
      if (ftype == Thrift.Type.I64) {
        this.tpcRefRssi = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 49:
      if (ftype == Thrift.Type.I64) {
        this.tpcRefStfSnrStep1 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 50:
      if (ftype == Thrift.Type.I64) {
        this.tpcRefStfSnrStep2 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 51:
      if (ftype == Thrift.Type.I64) {
        this.tpcDelPowerStep1 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 52:
      if (ftype == Thrift.Type.I64) {
        this.tpcDelPowerStep2 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 53:
      if (ftype == Thrift.Type.I64) {
        this.bfMode = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 54:
      if (ftype == Thrift.Type.I64) {
        this.bwHandlerMode = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 55:
      if (ftype == Thrift.Type.I64) {
        this.tpcRefStfSnrStep3 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 56:
      if (ftype == Thrift.Type.I64) {
        this.tpcDelPowerStep3 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 57:
      if (ftype == Thrift.Type.I64) {
        this.minTxPower = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 58:
      if (ftype == Thrift.Type.I64) {
        this.tpcAlphaDownRssiStep3Q10 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 59:
      if (ftype == Thrift.Type.I64) {
        this.tpcAlphaUpRssiStep3Q10 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 60:
      if (ftype == Thrift.Type.I64) {
        this.laInvPERTarget = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 61:
      if (ftype == Thrift.Type.I64) {
        this.laConvergenceFactordBperSFQ8 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 62:
      if (ftype == Thrift.Type.I64) {
        this.laMaxMcs = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 63:
      if (ftype == Thrift.Type.I64) {
        this.laMinMcs = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 64:
      if (ftype == Thrift.Type.I64) {
        this.maxAgcTrackingMargindB = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 65:
      if (ftype == Thrift.Type.I64) {
        this.maxAgcTrackingEnabled = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 66:
      if (ftype == Thrift.Type.I64) {
        this.noLinkTimeout = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 67:
      if (ftype == Thrift.Type.I64) {
        this.wsecEnable = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 68:
      if (ftype == Thrift.Type.I64) {
        this.key0 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 69:
      if (ftype == Thrift.Type.I64) {
        this.key1 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 70:
      if (ftype == Thrift.Type.I64) {
        this.key2 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 71:
      if (ftype == Thrift.Type.I64) {
        this.key3 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 72:
      if (ftype == Thrift.Type.I64) {
        this.controlSuperframe = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 73:
      if (ftype == Thrift.Type.I64) {
        this.tpcAlphaUpTargetRssiStep3Q10 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 74:
      if (ftype == Thrift.Type.I64) {
        this.crsScale = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 75:
      if (ftype == Thrift.Type.I64) {
        this.tpcAlphaDownTargetRssiStep3Q10 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 76:
      if (ftype == Thrift.Type.I64) {
        this.tpcHysteresisdBStep3Q2 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 77:
      if (ftype == Thrift.Type.I64) {
        this.measSlotEnable = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 78:
      if (ftype == Thrift.Type.I64) {
        this.measSlotPeriod = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 79:
      if (ftype == Thrift.Type.I64) {
        this.measSlotOffset = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 80:
      if (ftype == Thrift.Type.I64) {
        this.latpcUseIterations = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 81:
      if (ftype == Thrift.Type.I64) {
        this.maxTxPower = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 82:
      if (ftype == Thrift.Type.I64) {
        this.polarity = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

FwOptParams.prototype.write = function(output) {
  output.writeStructBegin('FwOptParams');
  if (this.antCodeBook !== null && this.antCodeBook !== undefined) {
    output.writeFieldBegin('antCodeBook', Thrift.Type.I64, 1);
    output.writeI64(this.antCodeBook);
    output.writeFieldEnd();
  }
  if (this.numOfPeerSta !== null && this.numOfPeerSta !== undefined) {
    output.writeFieldBegin('numOfPeerSta', Thrift.Type.I64, 4);
    output.writeI64(this.numOfPeerSta);
    output.writeFieldEnd();
  }
  if (this.gpioConfig !== null && this.gpioConfig !== undefined) {
    output.writeFieldBegin('gpioConfig', Thrift.Type.I64, 7);
    output.writeI64(this.gpioConfig);
    output.writeFieldEnd();
  }
  if (this.mcs !== null && this.mcs !== undefined) {
    output.writeFieldBegin('mcs', Thrift.Type.I64, 10);
    output.writeI64(this.mcs);
    output.writeFieldEnd();
  }
  if (this.txPower !== null && this.txPower !== undefined) {
    output.writeFieldBegin('txPower', Thrift.Type.I64, 11);
    output.writeI64(this.txPower);
    output.writeFieldEnd();
  }
  if (this.rxBuffer !== null && this.rxBuffer !== undefined) {
    output.writeFieldBegin('rxBuffer', Thrift.Type.I64, 12);
    output.writeI64(this.rxBuffer);
    output.writeFieldEnd();
  }
  if (this.beamConfig !== null && this.beamConfig !== undefined) {
    output.writeFieldBegin('beamConfig', Thrift.Type.I64, 13);
    output.writeI64(this.beamConfig);
    output.writeFieldEnd();
  }
  if (this.txBeamIndex !== null && this.txBeamIndex !== undefined) {
    output.writeFieldBegin('txBeamIndex', Thrift.Type.I64, 14);
    output.writeI64(this.txBeamIndex);
    output.writeFieldEnd();
  }
  if (this.rxBeamIndex !== null && this.rxBeamIndex !== undefined) {
    output.writeFieldBegin('rxBeamIndex', Thrift.Type.I64, 15);
    output.writeI64(this.rxBeamIndex);
    output.writeFieldEnd();
  }
  if (this.numOfHbLossToFail !== null && this.numOfHbLossToFail !== undefined) {
    output.writeFieldBegin('numOfHbLossToFail', Thrift.Type.I64, 18);
    output.writeI64(this.numOfHbLossToFail);
    output.writeFieldEnd();
  }
  if (this.statsLogInterval !== null && this.statsLogInterval !== undefined) {
    output.writeFieldBegin('statsLogInterval', Thrift.Type.I64, 19);
    output.writeI64(this.statsLogInterval);
    output.writeFieldEnd();
  }
  if (this.statsPrintInterval !== null && this.statsPrintInterval !== undefined) {
    output.writeFieldBegin('statsPrintInterval', Thrift.Type.I64, 20);
    output.writeI64(this.statsPrintInterval);
    output.writeFieldEnd();
  }
  if (this.forceGpsDisable !== null && this.forceGpsDisable !== undefined) {
    output.writeFieldBegin('forceGpsDisable', Thrift.Type.I64, 21);
    output.writeI64(this.forceGpsDisable);
    output.writeFieldEnd();
  }
  if (this.lsmAssocRespTimeout !== null && this.lsmAssocRespTimeout !== undefined) {
    output.writeFieldBegin('lsmAssocRespTimeout', Thrift.Type.I64, 22);
    output.writeI64(this.lsmAssocRespTimeout);
    output.writeFieldEnd();
  }
  if (this.lsmSendAssocReqRetry !== null && this.lsmSendAssocReqRetry !== undefined) {
    output.writeFieldBegin('lsmSendAssocReqRetry', Thrift.Type.I64, 23);
    output.writeI64(this.lsmSendAssocReqRetry);
    output.writeFieldEnd();
  }
  if (this.lsmAssocRespAckTimeout !== null && this.lsmAssocRespAckTimeout !== undefined) {
    output.writeFieldBegin('lsmAssocRespAckTimeout', Thrift.Type.I64, 24);
    output.writeI64(this.lsmAssocRespAckTimeout);
    output.writeFieldEnd();
  }
  if (this.lsmSendAssocRespRetry !== null && this.lsmSendAssocRespRetry !== undefined) {
    output.writeFieldBegin('lsmSendAssocRespRetry', Thrift.Type.I64, 25);
    output.writeI64(this.lsmSendAssocRespRetry);
    output.writeFieldEnd();
  }
  if (this.lsmRepeatAckInterval !== null && this.lsmRepeatAckInterval !== undefined) {
    output.writeFieldBegin('lsmRepeatAckInterval', Thrift.Type.I64, 26);
    output.writeI64(this.lsmRepeatAckInterval);
    output.writeFieldEnd();
  }
  if (this.lsmRepeatAck !== null && this.lsmRepeatAck !== undefined) {
    output.writeFieldBegin('lsmRepeatAck', Thrift.Type.I64, 27);
    output.writeI64(this.lsmRepeatAck);
    output.writeFieldEnd();
  }
  if (this.lsmFirstHeartbTimeout !== null && this.lsmFirstHeartbTimeout !== undefined) {
    output.writeFieldBegin('lsmFirstHeartbTimeout', Thrift.Type.I64, 28);
    output.writeI64(this.lsmFirstHeartbTimeout);
    output.writeFieldEnd();
  }
  if (this.txSlot0Start !== null && this.txSlot0Start !== undefined) {
    output.writeFieldBegin('txSlot0Start', Thrift.Type.I64, 29);
    output.writeI64(this.txSlot0Start);
    output.writeFieldEnd();
  }
  if (this.txSlot0End !== null && this.txSlot0End !== undefined) {
    output.writeFieldBegin('txSlot0End', Thrift.Type.I64, 30);
    output.writeI64(this.txSlot0End);
    output.writeFieldEnd();
  }
  if (this.txSlot1Start !== null && this.txSlot1Start !== undefined) {
    output.writeFieldBegin('txSlot1Start', Thrift.Type.I64, 31);
    output.writeI64(this.txSlot1Start);
    output.writeFieldEnd();
  }
  if (this.txSlot1End !== null && this.txSlot1End !== undefined) {
    output.writeFieldBegin('txSlot1End', Thrift.Type.I64, 32);
    output.writeI64(this.txSlot1End);
    output.writeFieldEnd();
  }
  if (this.txSlot2Start !== null && this.txSlot2Start !== undefined) {
    output.writeFieldBegin('txSlot2Start', Thrift.Type.I64, 33);
    output.writeI64(this.txSlot2Start);
    output.writeFieldEnd();
  }
  if (this.txSlot2End !== null && this.txSlot2End !== undefined) {
    output.writeFieldBegin('txSlot2End', Thrift.Type.I64, 34);
    output.writeI64(this.txSlot2End);
    output.writeFieldEnd();
  }
  if (this.rxSlot0Start !== null && this.rxSlot0Start !== undefined) {
    output.writeFieldBegin('rxSlot0Start', Thrift.Type.I64, 35);
    output.writeI64(this.rxSlot0Start);
    output.writeFieldEnd();
  }
  if (this.rxSlot0End !== null && this.rxSlot0End !== undefined) {
    output.writeFieldBegin('rxSlot0End', Thrift.Type.I64, 36);
    output.writeI64(this.rxSlot0End);
    output.writeFieldEnd();
  }
  if (this.rxSlot1Start !== null && this.rxSlot1Start !== undefined) {
    output.writeFieldBegin('rxSlot1Start', Thrift.Type.I64, 37);
    output.writeI64(this.rxSlot1Start);
    output.writeFieldEnd();
  }
  if (this.rxSlot1End !== null && this.rxSlot1End !== undefined) {
    output.writeFieldBegin('rxSlot1End', Thrift.Type.I64, 38);
    output.writeI64(this.rxSlot1End);
    output.writeFieldEnd();
  }
  if (this.rxSlot2Start !== null && this.rxSlot2Start !== undefined) {
    output.writeFieldBegin('rxSlot2Start', Thrift.Type.I64, 39);
    output.writeI64(this.rxSlot2Start);
    output.writeFieldEnd();
  }
  if (this.rxSlot2End !== null && this.rxSlot2End !== undefined) {
    output.writeFieldBegin('rxSlot2End', Thrift.Type.I64, 40);
    output.writeI64(this.rxSlot2End);
    output.writeFieldEnd();
  }
  if (this.linkAgc !== null && this.linkAgc !== undefined) {
    output.writeFieldBegin('linkAgc', Thrift.Type.I64, 42);
    output.writeI64(this.linkAgc);
    output.writeFieldEnd();
  }
  if (this.respNodeType !== null && this.respNodeType !== undefined) {
    output.writeFieldBegin('respNodeType', Thrift.Type.I64, 43);
    output.writeI64(this.respNodeType);
    output.writeFieldEnd();
  }
  if (this.txGolayIdx !== null && this.txGolayIdx !== undefined) {
    output.writeFieldBegin('txGolayIdx', Thrift.Type.I64, 44);
    output.writeI64(this.txGolayIdx);
    output.writeFieldEnd();
  }
  if (this.rxGolayIdx !== null && this.rxGolayIdx !== undefined) {
    output.writeFieldBegin('rxGolayIdx', Thrift.Type.I64, 45);
    output.writeI64(this.rxGolayIdx);
    output.writeFieldEnd();
  }
  if (this.bfAgc !== null && this.bfAgc !== undefined) {
    output.writeFieldBegin('bfAgc', Thrift.Type.I64, 46);
    output.writeI64(this.bfAgc);
    output.writeFieldEnd();
  }
  if (this.tpcEnable !== null && this.tpcEnable !== undefined) {
    output.writeFieldBegin('tpcEnable', Thrift.Type.I64, 47);
    output.writeI64(this.tpcEnable);
    output.writeFieldEnd();
  }
  if (this.tpcRefRssi !== null && this.tpcRefRssi !== undefined) {
    output.writeFieldBegin('tpcRefRssi', Thrift.Type.I64, 48);
    output.writeI64(this.tpcRefRssi);
    output.writeFieldEnd();
  }
  if (this.tpcRefStfSnrStep1 !== null && this.tpcRefStfSnrStep1 !== undefined) {
    output.writeFieldBegin('tpcRefStfSnrStep1', Thrift.Type.I64, 49);
    output.writeI64(this.tpcRefStfSnrStep1);
    output.writeFieldEnd();
  }
  if (this.tpcRefStfSnrStep2 !== null && this.tpcRefStfSnrStep2 !== undefined) {
    output.writeFieldBegin('tpcRefStfSnrStep2', Thrift.Type.I64, 50);
    output.writeI64(this.tpcRefStfSnrStep2);
    output.writeFieldEnd();
  }
  if (this.tpcDelPowerStep1 !== null && this.tpcDelPowerStep1 !== undefined) {
    output.writeFieldBegin('tpcDelPowerStep1', Thrift.Type.I64, 51);
    output.writeI64(this.tpcDelPowerStep1);
    output.writeFieldEnd();
  }
  if (this.tpcDelPowerStep2 !== null && this.tpcDelPowerStep2 !== undefined) {
    output.writeFieldBegin('tpcDelPowerStep2', Thrift.Type.I64, 52);
    output.writeI64(this.tpcDelPowerStep2);
    output.writeFieldEnd();
  }
  if (this.bfMode !== null && this.bfMode !== undefined) {
    output.writeFieldBegin('bfMode', Thrift.Type.I64, 53);
    output.writeI64(this.bfMode);
    output.writeFieldEnd();
  }
  if (this.bwHandlerMode !== null && this.bwHandlerMode !== undefined) {
    output.writeFieldBegin('bwHandlerMode', Thrift.Type.I64, 54);
    output.writeI64(this.bwHandlerMode);
    output.writeFieldEnd();
  }
  if (this.tpcRefStfSnrStep3 !== null && this.tpcRefStfSnrStep3 !== undefined) {
    output.writeFieldBegin('tpcRefStfSnrStep3', Thrift.Type.I64, 55);
    output.writeI64(this.tpcRefStfSnrStep3);
    output.writeFieldEnd();
  }
  if (this.tpcDelPowerStep3 !== null && this.tpcDelPowerStep3 !== undefined) {
    output.writeFieldBegin('tpcDelPowerStep3', Thrift.Type.I64, 56);
    output.writeI64(this.tpcDelPowerStep3);
    output.writeFieldEnd();
  }
  if (this.minTxPower !== null && this.minTxPower !== undefined) {
    output.writeFieldBegin('minTxPower', Thrift.Type.I64, 57);
    output.writeI64(this.minTxPower);
    output.writeFieldEnd();
  }
  if (this.tpcAlphaDownRssiStep3Q10 !== null && this.tpcAlphaDownRssiStep3Q10 !== undefined) {
    output.writeFieldBegin('tpcAlphaDownRssiStep3Q10', Thrift.Type.I64, 58);
    output.writeI64(this.tpcAlphaDownRssiStep3Q10);
    output.writeFieldEnd();
  }
  if (this.tpcAlphaUpRssiStep3Q10 !== null && this.tpcAlphaUpRssiStep3Q10 !== undefined) {
    output.writeFieldBegin('tpcAlphaUpRssiStep3Q10', Thrift.Type.I64, 59);
    output.writeI64(this.tpcAlphaUpRssiStep3Q10);
    output.writeFieldEnd();
  }
  if (this.laInvPERTarget !== null && this.laInvPERTarget !== undefined) {
    output.writeFieldBegin('laInvPERTarget', Thrift.Type.I64, 60);
    output.writeI64(this.laInvPERTarget);
    output.writeFieldEnd();
  }
  if (this.laConvergenceFactordBperSFQ8 !== null && this.laConvergenceFactordBperSFQ8 !== undefined) {
    output.writeFieldBegin('laConvergenceFactordBperSFQ8', Thrift.Type.I64, 61);
    output.writeI64(this.laConvergenceFactordBperSFQ8);
    output.writeFieldEnd();
  }
  if (this.laMaxMcs !== null && this.laMaxMcs !== undefined) {
    output.writeFieldBegin('laMaxMcs', Thrift.Type.I64, 62);
    output.writeI64(this.laMaxMcs);
    output.writeFieldEnd();
  }
  if (this.laMinMcs !== null && this.laMinMcs !== undefined) {
    output.writeFieldBegin('laMinMcs', Thrift.Type.I64, 63);
    output.writeI64(this.laMinMcs);
    output.writeFieldEnd();
  }
  if (this.maxAgcTrackingMargindB !== null && this.maxAgcTrackingMargindB !== undefined) {
    output.writeFieldBegin('maxAgcTrackingMargindB', Thrift.Type.I64, 64);
    output.writeI64(this.maxAgcTrackingMargindB);
    output.writeFieldEnd();
  }
  if (this.maxAgcTrackingEnabled !== null && this.maxAgcTrackingEnabled !== undefined) {
    output.writeFieldBegin('maxAgcTrackingEnabled', Thrift.Type.I64, 65);
    output.writeI64(this.maxAgcTrackingEnabled);
    output.writeFieldEnd();
  }
  if (this.noLinkTimeout !== null && this.noLinkTimeout !== undefined) {
    output.writeFieldBegin('noLinkTimeout', Thrift.Type.I64, 66);
    output.writeI64(this.noLinkTimeout);
    output.writeFieldEnd();
  }
  if (this.wsecEnable !== null && this.wsecEnable !== undefined) {
    output.writeFieldBegin('wsecEnable', Thrift.Type.I64, 67);
    output.writeI64(this.wsecEnable);
    output.writeFieldEnd();
  }
  if (this.key0 !== null && this.key0 !== undefined) {
    output.writeFieldBegin('key0', Thrift.Type.I64, 68);
    output.writeI64(this.key0);
    output.writeFieldEnd();
  }
  if (this.key1 !== null && this.key1 !== undefined) {
    output.writeFieldBegin('key1', Thrift.Type.I64, 69);
    output.writeI64(this.key1);
    output.writeFieldEnd();
  }
  if (this.key2 !== null && this.key2 !== undefined) {
    output.writeFieldBegin('key2', Thrift.Type.I64, 70);
    output.writeI64(this.key2);
    output.writeFieldEnd();
  }
  if (this.key3 !== null && this.key3 !== undefined) {
    output.writeFieldBegin('key3', Thrift.Type.I64, 71);
    output.writeI64(this.key3);
    output.writeFieldEnd();
  }
  if (this.controlSuperframe !== null && this.controlSuperframe !== undefined) {
    output.writeFieldBegin('controlSuperframe', Thrift.Type.I64, 72);
    output.writeI64(this.controlSuperframe);
    output.writeFieldEnd();
  }
  if (this.tpcAlphaUpTargetRssiStep3Q10 !== null && this.tpcAlphaUpTargetRssiStep3Q10 !== undefined) {
    output.writeFieldBegin('tpcAlphaUpTargetRssiStep3Q10', Thrift.Type.I64, 73);
    output.writeI64(this.tpcAlphaUpTargetRssiStep3Q10);
    output.writeFieldEnd();
  }
  if (this.crsScale !== null && this.crsScale !== undefined) {
    output.writeFieldBegin('crsScale', Thrift.Type.I64, 74);
    output.writeI64(this.crsScale);
    output.writeFieldEnd();
  }
  if (this.tpcAlphaDownTargetRssiStep3Q10 !== null && this.tpcAlphaDownTargetRssiStep3Q10 !== undefined) {
    output.writeFieldBegin('tpcAlphaDownTargetRssiStep3Q10', Thrift.Type.I64, 75);
    output.writeI64(this.tpcAlphaDownTargetRssiStep3Q10);
    output.writeFieldEnd();
  }
  if (this.tpcHysteresisdBStep3Q2 !== null && this.tpcHysteresisdBStep3Q2 !== undefined) {
    output.writeFieldBegin('tpcHysteresisdBStep3Q2', Thrift.Type.I64, 76);
    output.writeI64(this.tpcHysteresisdBStep3Q2);
    output.writeFieldEnd();
  }
  if (this.measSlotEnable !== null && this.measSlotEnable !== undefined) {
    output.writeFieldBegin('measSlotEnable', Thrift.Type.I64, 77);
    output.writeI64(this.measSlotEnable);
    output.writeFieldEnd();
  }
  if (this.measSlotPeriod !== null && this.measSlotPeriod !== undefined) {
    output.writeFieldBegin('measSlotPeriod', Thrift.Type.I64, 78);
    output.writeI64(this.measSlotPeriod);
    output.writeFieldEnd();
  }
  if (this.measSlotOffset !== null && this.measSlotOffset !== undefined) {
    output.writeFieldBegin('measSlotOffset', Thrift.Type.I64, 79);
    output.writeI64(this.measSlotOffset);
    output.writeFieldEnd();
  }
  if (this.latpcUseIterations !== null && this.latpcUseIterations !== undefined) {
    output.writeFieldBegin('latpcUseIterations', Thrift.Type.I64, 80);
    output.writeI64(this.latpcUseIterations);
    output.writeFieldEnd();
  }
  if (this.maxTxPower !== null && this.maxTxPower !== undefined) {
    output.writeFieldBegin('maxTxPower', Thrift.Type.I64, 81);
    output.writeI64(this.maxTxPower);
    output.writeFieldEnd();
  }
  if (this.polarity !== null && this.polarity !== undefined) {
    output.writeFieldBegin('polarity', Thrift.Type.I64, 82);
    output.writeI64(this.polarity);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

NodeFwParams = module.exports.NodeFwParams = function(args) {
  this.nodeInitOptParams = null;
  this.linkOptParams = null;
  if (args) {
    if (args.nodeInitOptParams !== undefined) {
      this.nodeInitOptParams = args.nodeInitOptParams;
    }
    if (args.linkOptParams !== undefined) {
      this.linkOptParams = args.linkOptParams;
    }
  }
};
NodeFwParams.prototype = {};
NodeFwParams.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.nodeInitOptParams = new ttypes.FwOptParams();
        this.nodeInitOptParams.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.linkOptParams = new ttypes.FwOptParams();
        this.linkOptParams.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

NodeFwParams.prototype.write = function(output) {
  output.writeStructBegin('NodeFwParams');
  if (this.nodeInitOptParams !== null && this.nodeInitOptParams !== undefined) {
    output.writeFieldBegin('nodeInitOptParams', Thrift.Type.STRUCT, 1);
    this.nodeInitOptParams.write(output);
    output.writeFieldEnd();
  }
  if (this.linkOptParams !== null && this.linkOptParams !== undefined) {
    output.writeFieldBegin('linkOptParams', Thrift.Type.STRUCT, 2);
    this.linkOptParams.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

