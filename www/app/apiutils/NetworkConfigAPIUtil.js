// util class for making API calls to the node server for network config
import axios from 'axios';

import {
  loadBaseConfigSuccess,
  loadNetworkConfigSuccess,
  loadNodeConfigSuccess
} from '../actions/NetworkConfigActions.js';

const mockConfigJSON = {
  "sysParams": {
    "managedConfig": true
  },
  "envParams": {
    "OPENR_ENABLED": "1",
    "OPENR_ALLOC_PREFIX": "1",
    "OPENR_USE_RTT_METRIC": "",
    "OPENR_USE_FIB_NSS": "1",
    "FW_NSS": "1",
    "OPENR_USE_FIB_LINUX": "",
    "OOB_NETNS": "1",
    "OOB_INTERFACE": "nic0",
    "CPE_INTERFACE": "",
    "E2E_ENABLED": "",
    "FW_IF2IF": "",
    "SYSTEM_LOGS_ENABLED": "1",
    "TOPOLOGY_FILE": "/data/e2e_topology.conf"
  },
  "fwParams": {
    "nodeInitOptParams": {
      "antCodeBook": 1,
      "numOfPeerSta": 1,
      "bfMode": 1,
      "bwHandlerMode": 2,
      "gpioConfig": 0,
      "numOfHbLossToFail": 10,
      "statsLogInterval": 625,
      "statsPrintInterval": 1024,
      "forceGpsDisable": 0,
      "lsmAssocRespTimeout": 500,
      "lsmSendAssocReqRetry": 5,
      "lsmAssocRespAckTimeout": 500,
      "lsmSendAssocRespRetry": 5,
      "lsmRepeatAckInterval": 50,
      "lsmRepeatAck": 1,
      "lsmFirstHeartbTimeout": 260,
      "txSlot0Start": 6,
      "txSlot0End": 86,
      "txSlot1Start": 96,
      "txSlot1End": 181,
      "txSlot2Start": 191,
      "txSlot2End": 196,
      "rxSlot0Start": 4,
      "rxSlot0End": 86,
      "rxSlot1Start": 94,
      "rxSlot1End": 181,
      "rxSlot2Start": 189,
      "rxSlot2End": 196,
      "txPower": 28,
      "rxBuffer": 63,
      "beamConfig": 2,
      "txBeamIndex": 5,
      "rxBeamIndex": 10,
      "maxAgcTrackingEnabled": 1,
      "maxAgcTrackingMargindB": 7,
      "bfAgc": 32837,
      "linkAgc": 33279,
      "crsScale" : 24,
      "tpcEnable": 3,
      "tpcRefRssi": -36,
      "tpcRefStfSnrStep1": 20,
      "tpcRefStfSnrStep2": 17,
      "tpcRefStfSnrStep3": 14,
      "tpcDelPowerStep1": 10,
      "tpcDelPowerStep2": 8,
      "tpcDelPowerStep3": 1,
      "tpcMinTxPowerIndex": 0,
      "tpcAlphaUpRssiStep3Q10" : 1014,
      "tpcAlphaDownRssiStep3Q10" : 768,
      "tpcAlphaUpTargetRssiStep3Q10" : 829,
      "tpcAlphaDownTargetRssiStep3Q10" : 1004,
      "mcs": 34,
      "laInvPERTarget" : 200,
      "laConvergenceFactor" : 380,
      "laMaxMcs" : 9,
      "laMinMcs" : 2,
      "noLinkTimeout": 15,
      "wsecEnable": 0,
      "key0": 1,
      "key1": 2,
      "key2": 3,
      "key3": 4,
      "measSlotEnable": 0,
      "measSlotPeriod": 8
    },
    "linkOptParams": {
      "txPower": 28,
      "rxBuffer": 63,
      "beamConfig": 2,
      "txBeamIndex": 5,
      "rxBeamIndex": 10,
      "mcs": 34,
      "respNodeType": 1,
      "measSlotOffset": 255
    }
  },
  "logTailParams": {
    "sources": {
      "terragraph_kern_logs": {
        "enabled": true,
        "filename": "/var/log/kern.log"
      },
      "terragraph_minion_logs": {
        "enabled": true,
        "filename": "/var/log/e2e_minion/current"
      },
      "terragraph_openr_logs": {
        "enabled": true,
        "filename": "/var/log/openr/current"
      }
    }
  },
  "statsAgentParams": {
    "sources": {
      "minion": {
        "enabled": true,
        "zmq_url": "tcp://[::1]:18989"
      },
      "openr": {
        "enabled": true,
        "zmq_url": "tcp://[::1]:60007"
      },
      "driver-if": {
        "enabled": true,
        "zmq_url": "tcp://[::1]:18990"
      },
      "system": {
        "enabled": true,
        "zmq_url": "ipc://stats-monitor-pub"
      },
      "controller": {
        "enabled": true,
        "zmq_url": "tcp://[::1]:28989"
      }
    }
  }
};

// TODO: until the API is actually out, I'll mock out a wait time of 200ms so I don't get an Error
// for dispatching while I dispatch (dispatchception)
export const getBaseConfig = (topologyName) => {
  // easy testing
  const smallJSON = {
    intField: 3,
    dblField: 2.352,
    nest1: {
      ception: 'asdf',
      cation: 'cathode ray tubes',
      check: false
    },
    cen: 'asdfjkl',
    gras: true,
    nest2: {
      nest3: {
        whoa: 'asdf',
        intField: 456
      },
      egg: 'tamagoyaki'
    }
  };

  // so what does this return, map of image version to config?
  setTimeout(() => {
    loadBaseConfigSuccess({
      config: smallJSON,
      topologyName,
    });
  }, 200);
};

export const getNetworkOverrideConfig = (topologyName) => {
  const networkOverrideJSON = {
    dblField: 2.352,
    nest1: {
      cation: 'cathode ray tubes',
      check: false
    },
    cen: 'asdfjkl',
    gras: false,
    nest2: {
      nest3: {
        intField: 789
      },
      egg: 'tamagoyaki'
    }
  };

  setTimeout(() => {
    loadNetworkConfigSuccess({
      config: networkOverrideJSON,
      topologyName,
    });
  }, 200);
};

export const getNodeOverrideConfig = (nodes, topologyName) => {
  const nodeOverrideJSON = {
    dblField: 3.1415,
    cen: 'qweryuio',
    gras: true,
    nest2: {
      egg: 'caviar'
    }
  };

  let returnedJSON = {};
  nodes.forEach(node => returnedJSON[node] = nodeOverrideJSON);

  setTimeout(() => {
    loadNodeConfigSuccess({
      config: returnedJSON,
      topologyName,
    });
  }, 200);
};

export const setNetworkOverrideConfig = (config) => {
  console.log('submitting network config', config);
};

export const setNodeOverrideConfig = (config) => {
  console.log('submitting node config', config);
};
