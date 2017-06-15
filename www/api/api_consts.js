const Controller_ttypes = require('../thrift/gen-nodejs/Controller_types');

const VerificationType = {
  // topology-based
  TOPOLOGY_NAME: 1,
  NODE_NAME: 10,
  IS_NODE_TYPE: 11,

  LINK_NAME: 20,
  LINK_TYPE: 21,

  SITE_NAME: 30,
  // other
  IS_BOOLEAN: 100,
  IS_STRING: 101,
  IS_DOUBLE: 102,
  VALID_MAC: 110,
};
/*
 * TODO - auto-generate apidocs from ApiMethods
 */
const ApiMethods = {
  "setLinkStatus": {
    "command": Controller_ttypes.MessageType.SET_LINK_STATUS_REQ,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "linkName": VerificationType.LINK_NAME,
      "linkUp": VerificationType.IS_BOOLEAN,
    }
  },
  "setNodeMacAddress": {
    "command": Controller_ttypes.MessageType.SET_NODE_MAC,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
      "mac": VerificationType.VALID_MAC,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  "addLink": {
    "command": Controller_ttypes.MessageType.ADD_LINK,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "nodeA": VerificationType.NODE_NAME,
      "nodeZ": VerificationType.NODE_NAME,
      "linkType": VerificationType.LINK_TYPE,
    }
  },
  "delLink": {
    "command": Controller_ttypes.MessageType.DEL_LINK,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "linkName": VerificationType.LINK_NAME,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  /* unsure */
  "addNode": {
    "command": Controller_ttypes.MessageType.ADD_NODE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.IS_NODE,
      "nodeType": VerificationType.IS_NODE_TYPE,
      "isPrimary": VerificationType.IS_BOOLEAN,
      "mac": VerificationType.VALID_MAC,
      "isPop": VerificationType.IS_BOOLEAN,
    }
  },
  "delNode": {
    "command": Controller_ttypes.MessageType.DEL_NODE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
    }
  },
  "addSite": {
    "command": Controller_ttypes.MessageType.ADD_SITE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "site": VerificationType.IS_STRING,
      "latitude": VerificationType.IS_DOUBLE,
      "longitude": VerificationType.IS_DOUBLE,
    }
  },
  "delSite": {
    "command": Controller_ttypes.MessageType.DEL_SITE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "site": VerificationType.IS_STRING,
    }
  },
  "rebootNode": {
    "command": Controller_ttypes.MessageType.REBOOT_NODE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "node": VerificationType.NODE_NAME,
      "force": VerificationType.IS_BOOLEAN,
    }
  },
  "getIgnitionState": {
    "command": Controller_ttypes.MessageType.GET_IGNITION_STATE,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
    }
  },
  "setNetworkIgnitionState": {
    "command": Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
    "fields": {
      "topology": VerificationType.TOPOLOGY_NAME,
      "enabled": VerificationType.IS_BOOLEAN,
    }
  },
  "setLinkIgnitionState": {
    "command": Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
    "fields": {
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
