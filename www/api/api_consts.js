const Controller_ttypes = require('../thrift/gen-nodejs/Controller_types');

const VerificationType = {
  // topology-based
  TOPOLOGY_NAME: 1,
  NODE_NAME: 10,
  IS_NODE_TYPE: 11,
  IS_POLARITY_TYPE: 12,

  LINK_NAME: 20,
  LINK_TYPE: 21,

  SITE_NAME: 30,
  // other
  IS_BOOLEAN: 100,
  IS_STRING: 101,
  IS_DOUBLE: 102,
  IS_NUMBER: 103,
  VALID_MAC: 110,
};
/*
 * TODO - auto-generate apidocs from ApiMethods
 */
const ApiMethods = {
  "setLinkStatus": {
    "command": Controller_ttypes.MessageType.SET_LINK_STATUS_REQ,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "linkName": VerificationType.LINK_NAME,
      "linkUp": VerificationType.IS_BOOLEAN,
    }
  },
  "setNodeMacAddress": {
    "command": Controller_ttypes.MessageType.SET_NODE_MAC,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
      "mac": VerificationType.VALID_MAC,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  "addLink": {
    "command": Controller_ttypes.MessageType.ADD_LINK,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "nodeA": VerificationType.NODE_NAME,
      "nodeZ": VerificationType.NODE_NAME,
      "linkType": VerificationType.LINK_TYPE,
    }
  },
  "delLink": {
    "command": Controller_ttypes.MessageType.DEL_LINK,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "linkName": VerificationType.LINK_NAME,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  /* unsure */
  "addNode": {
    "command": Controller_ttypes.MessageType.ADD_NODE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "nodeName": VerificationType.IS_STRING,
      "isPrimary": VerificationType.IS_BOOLEAN,
      // mac can be valid or empty
      "popNode": VerificationType.IS_BOOLEAN,
      "polarityType": VerificationType.IS_POLARITY_TYPE,
      "txGolay": VerificationType.IS_NUMBER,
      "rxGolay": VerificationType.IS_NUMBER,
      "siteName": VerificationType.IS_STRING,
      "antAzimuth": VerificationType.IS_DOUBLE,
      "antElevation": VerificationType.IS_DOUBLE,
    },
    "optional": {
      "macAddr": VerificationType.IS_STRING,
      "nodeType": VerificationType.IS_NODE_TYPE,
      "hasCpe": VerificationType.IS_BOOLEAN,
    }
  },
  "delNode": {
    "command": Controller_ttypes.MessageType.DEL_NODE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
    }
  },
  "addSite": {
    "command": Controller_ttypes.MessageType.ADD_SITE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "site": VerificationType.IS_STRING,
      "latitude": VerificationType.IS_DOUBLE,
      "longitude": VerificationType.IS_DOUBLE,
    }
  },
  "delSite": {
    "command": Controller_ttypes.MessageType.DEL_SITE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "site": VerificationType.IS_STRING,
    }
  },
  "rebootNode": {
    "command": Controller_ttypes.MessageType.REBOOT_NODE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  "getIgnitionState": {
    "command": Controller_ttypes.MessageType.GET_IGNITION_STATE,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
    }
  },
  "setNetworkIgnitionState": {
    "command": Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "enabled": VerificationType.IS_BOOLEAN,
    }
  },
  "setLinkIgnitionState": {
    "command": Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
    "required": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "linkName": VerificationType.LINK_NAME,
      "enabled": VerificationType.IS_BOOLEAN,
    }
  },
};

module.exports = {
  ApiMethods,
  VerificationType,
};
