/*
 * ZMQ controller/aggregator refresh process
 */
const ZMQ_TIMEOUT_MS = 4000;
const ZMQ_RAND_ID = parseInt(Math.random() * 1000);

const EventEmitter = require('events');
const process = require('process');
const thrift = require('thrift');
const zmq = require('zmq');
// thrift types from controller
const Topology_ttypes = require('./thrift/gen-nodejs/Topology_types');
const Controller_ttypes = require('./thrift/gen-nodejs/Controller_types');
// thrift types from aggregator
const Aggregator_ttypes = require('./thrift/gen-nodejs/Aggregator_types');
// main message loop from primary process
process.on('message', (msg) => {
  if (!msg.type) {
    console.error("Received unknown message", msg);
  }
  // wait for a message to start polling
  switch (msg.type) {
    case 'poll':
      // expect a list of IP addresses
      msg.topologies.forEach(topology => {
        const ctrlProxy = new ControllerProxy(topology.controller_ip);
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_TOPOLOGY, '\0');
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_IGNITION_STATE, '\0');
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_STATUS_DUMP, '\0');
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.UPGRADE_STATE_REQ, '\0');

        ctrlProxy.on('event', (type, success, response_time, data) => {
          switch (type) {
            case Controller_ttypes.MessageType.GET_TOPOLOGY:
              process.send({
                name: topology.name,
                type: 'topology_update',
                success: success,
                response_time: response_time,
                topology: success ? data.topology : null,
              });
              break;
            case Controller_ttypes.MessageType.GET_STATUS_DUMP:
              process.send({
                name: topology.name,
                type: 'status_dump_update',
                success: success,
                response_time: response_time,
                status_dump: success ? data.status_dump : null,
              });
              break;
            case Controller_ttypes.MessageType.GET_IGNITION_STATE:
              // which links are ignition candidates
              process.send({
                name: topology.name,
                type: 'ignition_state',
                success: success,
                response_time: response_time,
                ignition_state: success ? data.ignition_state : null,
              });
              break;
            case Controller_ttypes.MessageType.UPGRADE_STATE_REQ:
              // recvmsg.mType = UPGRADE_STATE_DUMP
              process.send({
                name: topology.name,
                type: 'upgrade_state',
                success: success,
                response_time: response_time,
                upgradeState: success ? data.upgradeState : null,
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });
        const aggrProxy = new AggregatorProxy(topology.aggregator_ip);
        // request the old and new structures until everyone is on the latest
        // don't pre-fetch routing
        aggrProxy.sendAggrMsgType(Aggregator_ttypes.AggrMessageType.GET_STATUS_REPORT, '\0');
        aggrProxy.sendAggrMsgType(Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED, '\0');
        aggrProxy.on('event', (type, success, response_time, data) => {
          switch (type) {
            case Aggregator_ttypes.AggrMessageType.GET_STATUS_REPORT:
              process.send({
                name: topology.name,
                type: 'aggr_status_report_update',
                success: success,
                response_time: response_time,
                status_report: success ? data.status_report : null,
              });
              break;
            case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED:
              process.send({
                name: topology.name,
                type: 'aggr_status_dump_update',
                success: success,
                response_time: response_time,
                status_dump: success ? data.status_dump : null,
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });
      });
      break;
    case 'scan_poll':
      msg.topologies.forEach(topology => {
        const ctrlProxy = new ControllerProxy(topology.controller_ip);
        var getScanStatus = new Controller_ttypes.GetScanStatus();
        getScanStatus.isConcise = false;
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_SCAN_STATUS, thriftSerialize(getScanStatus));
        ctrlProxy.on('event', (type, success, response_time, data) => {
          switch (type) {
            case Controller_ttypes.MessageType.GET_SCAN_STATUS:
              if (success && Object.keys(data.scan_status.scans).length != 0) {
                var resetScanStatus = new Controller_ttypes.ResetScanStatus();
                resetScanStatus.tokenFrom = Math.min.apply(null, Object.keys(data.scan_status.scans));
                resetScanStatus.tokenTo = Math.max.apply(null, Object.keys(data.scan_status.scans));
                const ctrlProxy2 = new ControllerProxy(topology.controller_ip);
                ctrlProxy2.sendCtrlMsgType(Controller_ttypes.MessageType.RESET_SCAN_STATUS, thriftSerialize(resetScanStatus));
                ctrlProxy2.on('event', (type, success, response_time, data) => {
                  switch (type) {
                    case Controller_ttypes.MessageType.RESET_SCAN_STATUS:
                      if (!success) {
                        console.error('Error resetting scan status', data);
                      }
                      break;
                    default:
                      console.error('Unhandled message type', type);
                  }
                });
              }
              process.send({
                name: topology.name,
                type: 'scan_status',
                success: success,
                scan_status: success ? data.scan_status : null,
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });
      });
      break;
    default:
      console.error("No handler for msg type", msg.type);
  }
});

const command2MsgType = {
  'setLinkStatus': Controller_ttypes.MessageType.SET_LINK_STATUS_REQ,
  'addLink': Controller_ttypes.MessageType.ADD_LINK,
  'delLink': Controller_ttypes.MessageType.DEL_LINK,
  'addNode': Controller_ttypes.MessageType.ADD_NODE,
  'delNode': Controller_ttypes.MessageType.DEL_NODE,
  'addSite': Controller_ttypes.MessageType.ADD_SITE,
  'delSite': Controller_ttypes.MessageType.DEL_SITE,
  'rebootNode': Controller_ttypes.MessageType.REBOOT_NODE,
  'editSite': Controller_ttypes.MessageType.EDIT_SITE,
  'editNode': Controller_ttypes.MessageType.EDIT_NODE,
  'setMac': Controller_ttypes.MessageType.SET_NODE_MAC,
  'setMacList': Controller_ttypes.MessageType.SET_NODE_MAC_LIST,
  'getIgnitionState': Controller_ttypes.MessageType.GET_IGNITION_STATE,
  'setNetworkIgnitionState': Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
  'setLinkIgnitionState': Controller_ttypes.MessageType.SET_IGNITION_PARAMS,

  // upgrade requests (sent to controller)
  'prepareUpgrade': Controller_ttypes.MessageType.UPGRADE_GROUP_REQ,
  'commitUpgrade': Controller_ttypes.MessageType.UPGRADE_GROUP_REQ,
  'abortUpgrade': Controller_ttypes.MessageType.UPGRADE_ABORT_REQ,

  // upgrade images
  'addUpgradeImage': Controller_ttypes.MessageType.UPGRADE_ADD_IMAGE_REQ,
  'deleteUpgradeImage': Controller_ttypes.MessageType.UPGRADE_DEL_IMAGE_REQ,
  'listUpgradeImages': Controller_ttypes.MessageType.UPGRADE_LIST_IMAGES_REQ,

  // config management
  'getBaseConfig': Controller_ttypes.MessageType.GET_CTRL_CONFIG_BASE_REQ,
  'getNetworkOverrideConfig': Controller_ttypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ,
  'getNodeOverrideConfig': Controller_ttypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ,
  'setNetworkOverrideConfig': Controller_ttypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ,
  'setNodeOverrideConfig': Controller_ttypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ,
};

var msgType2Params = {};
msgType2Params[Controller_ttypes.MessageType.GET_TOPOLOGY] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_REFRESH'};
msgType2Params[Controller_ttypes.MessageType.GET_STATUS_DUMP] = {
  'recvApp': 'ctrl-app-STATUS_APP',
  'nmsAppId': 'NMS_WEB_STATUS_REFRESH'};
msgType2Params[Controller_ttypes.MessageType.SET_LINK_STATUS_REQ] = {
  'recvApp': 'ctrl-app-IGNITION_APP',
  'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_LINK] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_LINK] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_NODE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_NODE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.EDIT_NODE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_SITE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_SITE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.EDIT_SITE] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.REBOOT_NODE] = {
  'recvApp': 'minion-app-STATUS_APP',
  'nmsAppId': 'NMS_WEB_STATUS_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_NODE_MAC] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_NODE_MAC_LIST] = {
  'recvApp': 'ctrl-app-TOPOLOGY_APP',
  'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_IGNITION_STATE] = {
  'recvApp': 'ctrl-app-IGNITION_APP',
  'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_IGNITION_PARAMS] = {
  'recvApp': 'ctrl-app-IGNITION_APP',
  'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_SCAN_STATUS] = {
  'recvApp': 'ctrl-app-SCAN_APP',
  'nmsAppId': 'NMS_WEB_SCAN'};
msgType2Params[Controller_ttypes.MessageType.RESET_SCAN_STATUS] = {
  'recvApp': 'ctrl-app-SCAN_APP',
  'nmsAppId': 'NMS_WEB_SCAN'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_GROUP_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_ABORT_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_STATE_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_ADD_IMAGE_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_DEL_IMAGE_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE'};
msgType2Params[Controller_ttypes.MessageType.UPGRADE_LIST_IMAGES_REQ] = {
  'recvApp': 'ctrl-app-UPGRADE_APP',
  'nmsAppId': 'NMS_WEB_UPGRADE'};
msgType2Params[Aggregator_ttypes.AggrMessageType.START_IPERF] = {
  'recvApp': 'aggr-app-TRAFFIC_APP',
  'nmsAppId': 'NMS_WEB_TRAFFIC'};
msgType2Params[Aggregator_ttypes.AggrMessageType.STOP_IPERF] = {
  'recvApp': 'aggr-app-TRAFFIC_APP',
  'nmsAppId': 'NMS_WEB_TRAFFIC'};
msgType2Params[Aggregator_ttypes.AggrMessageType.GET_IPERF_STATUS] = {
  'recvApp': 'aggr-app-TRAFFIC_APP',
  'nmsAppId': 'NMS_WEB_TRAFFIC'};

// config management mappings
msgType2Params[Controller_ttypes.MessageType.GET_CTRL_CONFIG_BASE_REQ] = {
  'recvApp': 'ctrl-app-CONFIG_APP',
  'nmsAppId': 'NMS_WEB_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ] = {
  'recvApp': 'ctrl-app-CONFIG_APP',
  'nmsAppId': 'NMS_WEB_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ] = {
  'recvApp': 'ctrl-app-CONFIG_APP',
  'nmsAppId': 'NMS_WEB_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ] = {
  'recvApp': 'ctrl-app-CONFIG_APP',
  'nmsAppId': 'NMS_WEB_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ] = {
  'recvApp': 'ctrl-app-CONFIG_APP',
  'nmsAppId': 'NMS_WEB_CONFIG'};

const thriftSerialize = (struct) => {
  var result;

  var transport = new thrift.TFramedTransport(null, function(byteArray) {
    // Flush puts a 4-byte header, which needs to be parsed/sliced.
     byteArray = byteArray.slice(4);
     result = byteArray;
  });
  var protocol = new thrift.TCompactProtocol(transport);

  struct.write(protocol);
  // Flushing the transport runs the callback, where we set result
  transport.flush();
  return result;
}

const sendCtrlMsgSync = (msg, minion, res) => {
  if (!msg.type) {
    console.error("sendCtrlMsgSync: Received unknown message", msg);
  }

  const send = (struct) => {
    var byteArray = thriftSerialize(struct);
    const ctrlProxy = new ControllerProxy(msg.topology.controller_ip);
    ctrlProxy.sendMsgTypeSync(command2MsgType[msg.type], byteArray, minion, res);
  };

  // prepare MSG body first, then send msg syncronously
  switch (msg.type) {
    case 'setLinkStatus':
      var setLinkStatusReq = new Controller_ttypes.SetLinkStatusReq();
      setLinkStatusReq.initiatorNodeName = msg.nodeA;
      setLinkStatusReq.responderNodeName = msg.nodeZ;
      setLinkStatusReq.action = msg.status ? Controller_ttypes.LinkActionType.LINK_UP : Controller_ttypes.LinkActionType.LINK_DOWN;
      send(setLinkStatusReq);
      break;
    case 'addLink':
      var addLinkReq = new Controller_ttypes.AddLink();
      var link = new Topology_ttypes.Link();
      link.name = msg.linkName;
      link.a_node_name = msg.nodeA;
      link.z_node_name = msg.nodeZ;
      link.link_type = msg.linkType;
      link.is_alive = 0; link.linkup_attempts = 0;
      addLinkReq.link = link;
      send(addLinkReq);
      break;
    case 'addNode':
      var addNodeReq = new Controller_ttypes.AddNode();
      var node = new Topology_ttypes.Node();
      var golay = new Topology_ttypes.GolayIdx();

      golay.txGolayIdx = msg.node.txGolayIdx;
      golay.rxGolayIdx = msg.node.rxGolayIdx;

      node.name = msg.node.name;
      node.node_type = msg.node.type == "DN" ? Topology_ttypes.NodeType.DN : Topology_ttypes.NodeType.CN;
      node.is_primary = msg.node.is_primary;
      node.mac_addr = msg.node.mac_addr;
      node.pop_node = msg.node.is_pop;
      node.polarity = msg.node.polarity == "ODD" ? Topology_ttypes.PolarityType.ODD : Topology_ttypes.PolarityType.EVEN;
      node.golay_idx = golay;
      node.site_name = msg.node.site_name;
      node.ant_azimuth = msg.node.ant_azimuth;
      node.ant_elevation = msg.node.ant_elevation;
      node.has_cpe = msg.node.has_cpe;

      addNodeReq.node = node;
      send(addNodeReq);
      break;
    case 'addSite':
      var addSiteReq = new Controller_ttypes.AddSite();
      var site = new Topology_ttypes.Site();
      var location = new Topology_ttypes.Location();

      location.latitude = msg.site.lat;
      location.longitude = msg.site.long;
      location.altitude = msg.site.alt;

      site.name = msg.site.name;
      site.location = location;
      addSiteReq.site = site;
      send(addSiteReq);
      break;
    case 'editSite':
      var editSiteReq = new Controller_ttypes.EditSite();
      editSiteReq.siteName = msg.siteName;
      editSiteReq.newSite = new Topology_ttypes.Site();
      editSiteReq.newSite.name = msg.newSiteName;
      send(editSiteReq);
      break;
    case 'editNode':
      var editNodeReq = new Controller_ttypes.EditNode();
      editNodeReq.nodeName = msg.nodeName;
      editNodeReq.newNode = new Topology_ttypes.Node();
      editNodeReq.newNode.name = msg.newNodeName;
      send(editNodeReq);
      break;
    case 'delLink':
      var delLinkReq = new Controller_ttypes.DelLink();
      delLinkReq.a_node_name = msg.nodeA;
      delLinkReq.z_node_name = msg.nodeZ;
      delLinkReq.forceDelete = msg.forceDelete;
      send(delLinkReq);
      break;
    case 'delNode':
      var delNodeReq = new Controller_ttypes.DelNode();
      delNodeReq.nodeName = msg.node;
      delNodeReq.forceDelete = msg.forceDelete;
      send(delNodeReq);
      break;
    case 'delSite':
      var delSiteReq = new Controller_ttypes.DelSite();
      delSiteReq.siteName = msg.site;
      send(delSiteReq);
      break;
    case 'rebootNode':
      var rebootNode = new Controller_ttypes.RebootNode();
      rebootNode.forced = msg.forceReboot;
      send(rebootNode);
      break;
    case 'setMac':
      var setNodeMacReq = new Controller_ttypes.SetNodeMac();
      setNodeMacReq.nodeName = msg.node;
      setNodeMacReq.nodeMac = msg.mac;
      setNodeMacReq.force = msg.force;
      send(setNodeMacReq);
      break;
    case 'setMacList':
      var setNodeMacListReq = new Controller_ttypes.SetNodeMacList();
      let nodeMacList = [];
      Object.keys(msg.nodeToMac).forEach(nodeName => {
        let macAddr = msg.nodeToMac[nodeName];
        let setNodeMacReq = new Controller_ttypes.SetNodeMac();
        setNodeMacReq.nodeName = nodeName;
        setNodeMacReq.nodeMac = macAddr;
        nodeMacList.push(setNodeMacReq);
      });
      setNodeMacListReq.setNodeMacList = nodeMacList;
      setNodeMacListReq.force = msg.force;
      send(setNodeMacListReq);
      break;
    case 'getIgnitionState':
      var getIgnitionStateReq = new Controller_ttypes.GetIgnitionState();
      send(getIgnitionStateReq);
      break;
    case 'setNetworkIgnitionState':
      var setIgnitionParamsReq = new Controller_ttypes.IgnitionParams();
      setIgnitionParamsReq.enable = msg.state;
      send(setIgnitionParamsReq);
      break;
    case 'setLinkIgnitionState':
      var setIgnitionParamsReq = new Controller_ttypes.IgnitionParams();
      setIgnitionParamsReq.link_auto_ignite = {};
      setIgnitionParamsReq.link_auto_ignite[msg.linkName] = msg.state;
      send(setIgnitionParamsReq);
      break;
    case 'prepareUpgrade':
      // first set up the upgrade req that the controller sends to minions
      var upgradeReqParams = new Controller_ttypes.UpgradeReq();
      upgradeReqParams.urType = Controller_ttypes.UpgradeReqType.PREPARE_UPGRADE;
      upgradeReqParams.upgradeReqId = msg.requestId;
      upgradeReqParams.md5 = msg.md5;
      upgradeReqParams.imageUrl = msg.imageUrl;

      if (msg.isHttp) {
        upgradeReqParams.downloadAttempts = msg.downloadAttempts;
      } else {
        var torrentParams = new Controller_ttypes.UpgradeTorrentParams();
        const {downloadTimeout, downloadLimit, uploadLimit, maxConnections} = msg.torrentParams;
        torrentParams.downloadTimeout = downloadTimeout;
        torrentParams.downloadLimit = downloadLimit;
        torrentParams.uploadLimit = uploadLimit;
        torrentParams.maxConnections = maxConnections;

        upgradeReqParams.torrentParams = torrentParams;
      }

      // then set up the group upgrade req
      var upgradeGroupReqParams = new Controller_ttypes.UpgradeGroupReq();
      upgradeGroupReqParams.ugType = Controller_ttypes.UpgradeGroupType.NETWORK;

      upgradeGroupReqParams.nodes = [];
      upgradeGroupReqParams.excludeNodes = msg.excludeNodes;

      upgradeGroupReqParams.urReq = upgradeReqParams;
      upgradeGroupReqParams.timeout = msg.timeout;
      upgradeGroupReqParams.skipFailure = msg.skipFailure;
      upgradeGroupReqParams.version = '';
      upgradeGroupReqParams.skipLinks = [];
      upgradeGroupReqParams.limit = msg.limit;

      send(upgradeGroupReqParams);
      break;
    case 'commitUpgrade':
      var upgradeReqParams = new Controller_ttypes.UpgradeReq();
      upgradeReqParams.urType = Controller_ttypes.UpgradeReqType.COMMIT_UPGRADE;
      upgradeReqParams.upgradeReqId = msg.requestId;
      upgradeReqParams.scheduleToCommit = msg.scheduleToCommit;

      var upgradeGroupReqParams = new Controller_ttypes.UpgradeGroupReq();
      upgradeGroupReqParams.ugType = msg.upgradeGroupType,

      upgradeGroupReqParams.nodes = msg.nodes;
      upgradeGroupReqParams.excludeNodes = msg.excludeNodes;

      upgradeGroupReqParams.urReq = upgradeReqParams;
      upgradeGroupReqParams.timeout = msg.timeout;
      upgradeGroupReqParams.skipFailure = msg.skipFailure;
      upgradeGroupReqParams.version = '';
      upgradeGroupReqParams.skipLinks = msg.skipLinks;
      upgradeGroupReqParams.limit = msg.limit;

      send(upgradeGroupReqParams);
      break;
    case 'abortUpgrade':
      var abortUpgradeParams = new Controller_ttypes.UpgradeAbortReq();
      abortUpgradeParams.abortAll = msg.abortAll;
      abortUpgradeParams.reqIds = msg.reqIds;

      send(abortUpgradeParams);
      break;
    case 'listUpgradeImages':
      var listUpgradeImagesParams = new Controller_ttypes.UpgradeListImagesReq();
      send(listUpgradeImagesParams);

      break;
    case 'addUpgradeImage':
      var addUpgradeImageParams = new Controller_ttypes.UpgradeAddImageReq();
      addUpgradeImageParams.imageUrl = msg.imagePath;
      send(addUpgradeImageParams);

      break;
    case 'deleteUpgradeImage':
      var delUpgradeImageParams = new Controller_ttypes.UpgradeDelImageReq();
      delUpgradeImageParams.name = msg.name;
      send(delUpgradeImageParams);

      break;
    // config messages. These are sent asynchronously
    case 'getBaseConfig':
      var getCtrlConfigBaseReqParams = new Controller_ttypes.GetCtrlConfigReq();
      getCtrlConfigBaseReqParams.swVersions = [];
      send(getCtrlConfigBaseReqParams);

      break;
    case 'getNetworkOverrideConfig':
      var getNetworkOverrideParams = new Controller_ttypes.GetCtrlConfigNetworkOverridesReq();
      send(getNetworkOverrideParams);

      break;
    case 'getNodeOverrideConfig':
      var getNodeOverrideParams = new Controller_ttypes.GetCtrlConfigNodeOverridesReq();
      getNodeOverrideParams.nodes = [];
      send(getNodeOverrideParams);

      break;
    case 'setNetworkOverrideConfig':
      var setNetworkOverrideParams = new Controller_ttypes.SetCtrlConfigNetworkOverridesReq();
      setNetworkOverrideParams.config = JSON.stringify(msg.config);
      send(setNetworkOverrideParams);

      break;
    case 'setNodeOverrideConfig':
      var setNodeOverrideParams = new Controller_ttypes.SetCtrlConfigNodeOverridesReq();
      setNodeOverrideParams.overrides = JSON.stringify(msg.config);
      send(setNodeOverrideParams);

      break;
    default:
      console.error("sendCtrlMsgSync: No handler for msg type", msg.type);
      res.status(500).send("FAIL");
  }
};

class ControllerProxy extends EventEmitter {
  constructor(controllerIp) {
    super();
    this.controller_ip = controllerIp;
//    if (typeof controllerIp != "string" ||
//        controllerIp.length == 0) {
//      throw new Error("Invalid controller IP: ", controllerIp);
//    }
  }
  /*
   * Send and decode the expected message based on the type.
   */
  sendCtrlMsgType(msgType, msgBody) {
    var sendMsg = new Controller_ttypes.Message();
    sendMsg.mType = msgType;
    sendMsg.value = msgBody;
    var recvMsg = new Controller_ttypes.Message();

    let zmqRandId = parseInt(Math.random() * 1000);
    let nmsAppId = msgType2Params[msgType].nmsAppId + zmqRandId;
    // time the response
    this.sendCtrlMsg(
      sendMsg,
      recvMsg,
      nmsAppId,
      msgType2Params[msgType].recvApp,
      "",
      (tProtocol, tTransport) => {
        const endTimer = new Date();
        switch (msgType) {
          case Controller_ttypes.MessageType.GET_TOPOLOGY:
            var receivedTopology = new Topology_ttypes.Topology();
            receivedTopology.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { topology: receivedTopology });
            break;
          case Controller_ttypes.MessageType.GET_STATUS_DUMP:
            var receivedStatusDumps = new Controller_ttypes.StatusDump();
            receivedStatusDumps.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { status_dump: receivedStatusDumps });
            break;
          case Controller_ttypes.MessageType.GET_SCAN_STATUS:
            var receivedScanStatus = new Controller_ttypes.ScanStatus();
            receivedScanStatus.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { scan_status: receivedScanStatus });
            break;
          case Controller_ttypes.MessageType.RESET_SCAN_STATUS:
            var receivedAck = new Controller_ttypes.E2EAck();
            receivedAck.read(tProtocol);
            this.emit('event',
                      msgType,
                      receivedAck.success,
                      endTimer - this.start_timer,
                      { msg: receivedAck.message});
          case Controller_ttypes.MessageType.GET_IGNITION_STATE:
            var ignitionState = new Controller_ttypes.IgnitionState();
            ignitionState.read(tProtocol);
            this.emit('event',
                      msgType,
                      true,
                      endTimer - this.start_timer,
                      {ignition_state: ignitionState});
            break;
          case Controller_ttypes.MessageType.UPGRADE_STATE_REQ:
            // recvmsg.mType = UPGRADE_STATE_DUMP
            var stateDump = new Controller_ttypes.UpgradeStateDump();
            stateDump.read(tProtocol);
            this.emit('event',
                      msgType,
                      true,
                      endTimer - this.start_timer,
                      { upgradeState: stateDump });
            break;
          default:
            console.error('[controller] No receive handler defined for', msgType);
        }
      },
      () => {
        // error condition
        const endTimer = new Date();
        this.emit('event',
                  msgType,
                  false /* success */,
                  endTimer - this.start_timer,
                  { timeout: false });
      }
    );
  }

  sendMsgType(msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new Controller_ttypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new Controller_ttypes.Message();

      let nmsAppId = msgType2Params[msgType].nmsAppId + ZMQ_RAND_ID;

      // time the response
      let zmqRandId = parseInt(Math.random() * 1000);
      this.sendCtrlMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId + zmqRandId,
        msgType2Params[msgType].recvApp,
        minion,
        (tProtocol, tTransport) => {
          switch (msgType) {
            case Controller_ttypes.MessageType.SET_LINK_STATUS_REQ:
            case Controller_ttypes.MessageType.ADD_LINK:
            case Controller_ttypes.MessageType.ADD_NODE:
            case Controller_ttypes.MessageType.ADD_SITE:
            case Controller_ttypes.MessageType.DEL_LINK:
            case Controller_ttypes.MessageType.DEL_NODE:
            case Controller_ttypes.MessageType.DEL_SITE:
            case Controller_ttypes.MessageType.EDIT_NODE:
            case Controller_ttypes.MessageType.EDIT_SITE:
            case Controller_ttypes.MessageType.REBOOT_NODE:
            case Controller_ttypes.MessageType.SET_NODE_MAC:
            case Controller_ttypes.MessageType.SET_NODE_MAC_LIST:
            case Controller_ttypes.MessageType.SET_IGNITION_PARAMS:
            case Controller_ttypes.MessageType.UPGRADE_GROUP_REQ:
            case Controller_ttypes.MessageType.UPGRADE_ABORT_REQ:
            case Controller_ttypes.MessageType.UPGRADE_ADD_IMAGE_REQ:
            case Controller_ttypes.MessageType.UPGRADE_DEL_IMAGE_REQ:
            case Controller_ttypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
            case Controller_ttypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              var receivedAck = new Controller_ttypes.E2EAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({type: 'ack', msg: receivedAck.message});
              } else {
                reject(receivedAck.message);
              }
              break;
            case Controller_ttypes.MessageType.GET_IGNITION_STATE:
              var ignitionState = new Controller_ttypes.IgnitionState();
              ignitionState.read(tProtocol);
              resolve({type: 'msg', msg: ignitionState});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_BASE_REQ:
              let baseConfig = new Controller_ttypes.GetCtrlConfigBaseResp();
              baseConfig.read(tProtocol);
              resolve({type: 'msg', msg: baseConfig});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
              let nodeOverrideConfig = new Controller_ttypes.GetCtrlConfigNodeOverridesResp();
              nodeOverrideConfig.read(tProtocol);
              resolve({type: 'msg', msg: nodeOverrideConfig});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              let networkOverrideConfig = new Controller_ttypes.GetCtrlConfigNetworkOverridesResp();
              networkOverrideConfig.read(tProtocol);
              resolve({type: 'msg', msg: networkOverrideConfig});
              break;
            default:
              console.error('[controller] No receive handler defined for', msgType);
          }
        },
        (errMsg) => {
          reject(errMsg);
        }
      );
    });

    ctrlPromise.then((msg) => {
      if (msg.type == 'ack') {
        let result = {"success": true};
        res.status(200).end(JSON.stringify(result));
      } else {
        res.json(msg.msg);
      }
    })
    .catch((failMessage) => {
      let result = {
        "success": false,
        "error": failMessage
      };
      res.status(500).end(JSON.stringify(result));
      res.end();
    });
  }

  sendMsgTypeSync(msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new Controller_ttypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new Controller_ttypes.Message();

      let nmsAppId = msgType2Params[msgType].nmsAppId + ZMQ_RAND_ID;
      // time the response

      let zmqRandId = parseInt(Math.random() * 1000);
      this.sendCtrlMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId + zmqRandId,
        msgType2Params[msgType].recvApp,
        minion,
        (tProtocol, tTransport) => {
          switch (msgType) {
            case Controller_ttypes.MessageType.SET_LINK_STATUS_REQ:
            case Controller_ttypes.MessageType.ADD_LINK:
            case Controller_ttypes.MessageType.ADD_NODE:
            case Controller_ttypes.MessageType.ADD_SITE:
            case Controller_ttypes.MessageType.DEL_LINK:
            case Controller_ttypes.MessageType.DEL_NODE:
            case Controller_ttypes.MessageType.DEL_SITE:
            case Controller_ttypes.MessageType.EDIT_NODE:
            case Controller_ttypes.MessageType.EDIT_SITE:
            case Controller_ttypes.MessageType.REBOOT_NODE:
            case Controller_ttypes.MessageType.SET_NODE_MAC:
            case Controller_ttypes.MessageType.SET_NODE_MAC_LIST:
            case Controller_ttypes.MessageType.SET_IGNITION_PARAMS:
            case Controller_ttypes.MessageType.UPGRADE_GROUP_REQ:
            case Controller_ttypes.MessageType.UPGRADE_ABORT_REQ:
            case Controller_ttypes.MessageType.UPGRADE_ADD_IMAGE_REQ:
            case Controller_ttypes.MessageType.UPGRADE_DEL_IMAGE_REQ:
            case Controller_ttypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
            case Controller_ttypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              var receivedAck = new Controller_ttypes.E2EAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({type: 'ack', msg: receivedAck.message});
              } else {
                reject(receivedAck.message);
              }
              break;
            case Controller_ttypes.MessageType.GET_IGNITION_STATE:
              var ignitionState = new Controller_ttypes.IgnitionState();
              ignitionState.read(tProtocol);
              resolve({type: 'msg', msg: ignitionState});
              break;
            case Controller_ttypes.MessageType.UPGRADE_LIST_IMAGES_REQ:
              var upgradeImages = new Controller_ttypes.UpgradeListImagesResp();
              upgradeImages.read(tProtocol);
              resolve({type: 'msg', msg: upgradeImages});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_BASE_REQ:
              let baseConfig = new Controller_ttypes.GetCtrlConfigBaseResp();
              baseConfig.read(tProtocol);
              resolve({type: 'msg', msg: baseConfig});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
              let nodeOverrideConfig = new Controller_ttypes.GetCtrlConfigNodeOverridesResp();
              nodeOverrideConfig.read(tProtocol);
              resolve({type: 'msg', msg: nodeOverrideConfig});
              break;
            case Controller_ttypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              let networkOverrideConfig = new Controller_ttypes.GetCtrlConfigNetworkOverridesResp();
              networkOverrideConfig.read(tProtocol);
              resolve({type: 'msg', msg: networkOverrideConfig});
              break;
            default:
              console.error('[controller] No receive handler defined for', msgType);
          }
        },
        (errMsg) => {
          reject(errMsg);
        }
      );
    });

    ctrlPromise.then((msg) => {
      if (msg.type == 'ack') {
        res.writeHead(200, msg.msg, {'content-type' : 'text/plain'});
        res.end();
      } else {
        res.json(msg.msg);
//        res.writeHead(200, msg.msg, {'content-type' : 'application/json'});
        //res.end();
      }
    })
    .catch((failMessage) => {
      res.writeHead(500, failMessage, {'content-type' : 'text/plain'});
      res.end();
    });
  }

  /*
   * Send any message to the controller.
   */
  sendCtrlMsg(sendMsg, recvMsg, sendAppName, recvAppName, minion, recvCb, errCb) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.controller_ip +']:17077');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb(err.message);
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send(minion, zmq.ZMQ_SNDMORE);
       dealer.send(recvAppName, zmq.ZMQ_SNDMORE);
       dealer.send(sendAppName, zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });
    const tProtocol = new thrift.TCompactProtocol(transport);
    // watch for connection timeouts
    const timeoutTimer = setTimeout(() => {
      errCb("Timeout");
      dealer.close();
    }, ZMQ_TIMEOUT_MS);
    // send msg
    this.start_timer = new Date();
    sendMsg.write(tProtocol);
    transport.flush();
  }
/**
 * API for performing write operations
 * new ControllerProxy(controller_ip)
 * sendSyncMsgType()
 * write()
 *
 * addLink(linkName, nodeAName, nodeZName)
 * setLinkStatus(nodeAName, nodeZName, upOrDown)
 */
}


class AggregatorProxy extends EventEmitter {
  constructor(aggregatorIp) {
    super();
    this.aggregator_ip = aggregatorIp;
  }

  sendMsgType(msgType, msgBody, minion, res) {
    let aggrPromise = new Promise((resolve, reject) => {
      var sendMsg = new Aggregator_ttypes.AggrMessage();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new Aggregator_ttypes.AggrMessage();

      // time the response
      let zmqRandId = parseInt(Math.random() * 1000);
      this.sendAggrMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId + zmqRandId,
        msgType2Params[msgType].recvApp,
        minion,
        (tProtocol, tTransport) => {
          switch (msgType) {
            case Aggregator_ttypes.AggrMessageType.GET_IPERF_STATUS:
              var receivedStatus = new Aggregator_ttypes.AggrIperfStatusReport();
              receivedStatus.read(tProtocol);
              resolve({type: 'msg', msg: receivedStatus});
              break;
            case Aggregator_ttypes.AggrMessageType.START_IPERF:
              var receivedAck = new Aggregator_ttypes.AggrAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({type: 'ack', msg: receivedAck.message});
              } else {
                reject(receivedAck.message);
              }
              break;
            default:
              console.error('[aggregator] No receive handler defined for', msgType);
          }
        },
        (errMsg) => {
          reject(errMsg);
        }
      );
    });

    aggrPromise.then((msg) => {
      if (msg.type == 'ack') {
        let result = {"success": true, "message": msg.msg};
        res.status(200).end(JSON.stringify(result));
      } else {
        res.json(msg.msg);
      }
    })
    .catch((failMessage) => {
      let result = {
        "success": false,
        "error": failMessage
      };
      res.status(500).end(JSON.stringify(result));
      res.end();
    });
  }

  sendAggrMsg(sendMsg, recvMsg, sendAppName, recvAppName, minion, recvCb, errCb) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.aggregator_ip +']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb(err.message);
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send(minion, zmq.ZMQ_SNDMORE);
       dealer.send(recvAppName, zmq.ZMQ_SNDMORE);
       dealer.send(sendAppName, zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });
    const tProtocol = new thrift.TCompactProtocol(transport);
    // watch for connection timeouts
    const timeoutTimer = setTimeout(() => {
      errCb("Timeout");
      dealer.close();
    }, ZMQ_TIMEOUT_MS);
    // send msg
    this.start_timer = new Date();
    sendMsg.write(tProtocol);
    transport.flush();
  }
  /*
   * Send and decode the expected message based on the type.
   */
  sendAggrMsgType(msgType, msgBody) {
    var sendMsg = new Aggregator_ttypes.AggrMessage();
    sendMsg.mType = msgType;
    sendMsg.value = msgBody;
    var recvMsg = new Aggregator_ttypes.AggrMessage();
    let recvApp, nmsAppIdentity;
    // determine receiver app
    switch (msgType) {
      case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED:
      case Aggregator_ttypes.AggrMessageType.GET_STATUS_REPORT:
      case Aggregator_ttypes.AggrMessageType.GET_ROUTING_REPORT:
        recvApp = 'aggr-app-STATUS_APP';
        nmsAppIdentity = 'NMS_WEB_AGGR_STATUS_REFRESH';
        break;
      case Aggregator_ttypes.AggrMessageType.START_IPERF:
        recvApp = 'aggr-app-TRAFFIC_APP';
        nmsAppIdentity = 'NMS_WEB_AGGR';
        break;
      default:
        console.error('[aggregator] Unknown message type', msgType);
    }
    // time the response
    let zmqRandId = parseInt(Math.random() * 1000);
    this.sendMsg(
      sendMsg,
      recvMsg,
      nmsAppIdentity + zmqRandId,
      recvApp,
      (tProtocol, tTransport) => {
        const endTimer = new Date();
        switch (msgType) {
          case Aggregator_ttypes.AggrMessageType.GET_STATUS_REPORT:
            var receivedStatusReport = new Aggregator_ttypes.AggrStatusReport();
            receivedStatusReport.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { status_report: receivedStatusReport });
            break;
          case Aggregator_ttypes.AggrMessageType.GET_ROUTING_REPORT:
            var receivedRoutingReport = new Aggregator_ttypes.AggrRoutingReport();
            receivedRoutingReport.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { routing_report: receivedRoutingReport });
            break;
          case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED:
            var receivedStatusDump = new Aggregator_ttypes.AggrStatusDump_Deprecated();
            receivedStatusDump.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { status_dump: receivedStatusDump });
            break;
          default:
            console.error('[aggregator] No receive handler defined for', msgType);
        }
      },
      () => {
        // error condition
        const endTimer = new Date();
        this.emit('event',
                  msgType,
                  false /* success */,
                  endTimer - this.start_timer,
                  { timeout: false });
      }
    );
  }

  /*
   * Send any message to the controller.
   */
  sendMsg(sendMsg, recvMsg, sendAppName, recvAppName, recvCb, errCb) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.aggregator_ip +']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb();
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send("", zmq.ZMQ_SNDMORE);
       dealer.send(recvAppName, zmq.ZMQ_SNDMORE);
       dealer.send(sendAppName, zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });
    const tProtocol = new thrift.TCompactProtocol(transport);
    // watch for connection timeouts
    const timeoutTimer = setTimeout(() => {
      const endTimer = new Date();
      this.emit('event',
                sendMsg.mType,
                false /* success */,
                endTimer - this.start_timer,
                { timeout: true });
      dealer.close();
    }, ZMQ_TIMEOUT_MS);
    // send msg
    this.start_timer = new Date();
    sendMsg.write(tProtocol);
    transport.flush();
  }
}
module.exports = {
  ControllerProxy: ControllerProxy,
  AggregatorProxy: AggregatorProxy,
  sendCtrlMsgSync: sendCtrlMsgSync,
};
