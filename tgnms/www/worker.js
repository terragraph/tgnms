/*
 * ZMQ controller/aggregator refresh process
 */
const ZMQ_TIMEOUT_MS = 4000;

const EventEmitter = require('events');
const process = require('process');
const thrift = require('thrift');
const zmq = require('zmq');
// thrift types from controller
const topologyTTypes = require('./thrift/gen-nodejs/Topology_types');
const controllerTTypes = require('./thrift/gen-nodejs/Controller_types');
// thrift types from aggregator
const aggregatorTTypes = require('./thrift/gen-nodejs/Aggregator_types');
// main message loop from primary process
process.on('message', msg => {
  if (!msg.type) {
    console.error('Received unknown message', msg);
  }
  // wait for a message to start polling
  switch (msg.type) {
    case 'poll':
      // expect a list of IP addresses
      msg.topologies.forEach(topology => {
        const ctrlProxy = new ControllerProxy(topology.controller_ip);
        ctrlProxy.sendCtrlMsgType(
          controllerTTypes.MessageType.GET_TOPOLOGY,
          '\0'
        );
        ctrlProxy.sendCtrlMsgType(
          controllerTTypes.MessageType.GET_IGNITION_STATE,
          '\0'
        );
        ctrlProxy.sendCtrlMsgType(
          controllerTTypes.MessageType.GET_STATUS_DUMP,
          '\0'
        );
        ctrlProxy.sendCtrlMsgType(
          controllerTTypes.MessageType.UPGRADE_STATE_REQ,
          '\0'
        );

        ctrlProxy.on('event', (type, success, responseTime, data) => {
          switch (type) {
            case controllerTTypes.MessageType.GET_TOPOLOGY:
              process.send({
                name: topology.name,
                type: 'topology_update',
                success: success,
                response_time: responseTime,
                topology: success ? data.topology : null
              });
              break;
            case controllerTTypes.MessageType.GET_STATUS_DUMP:
              process.send({
                name: topology.name,
                type: 'status_dump_update',
                success: success,
                response_time: responseTime,
                status_dump: success ? data.status_dump : null
              });
              break;
            case controllerTTypes.MessageType.GET_IGNITION_STATE:
              // which links are ignition candidates
              process.send({
                name: topology.name,
                type: 'ignition_state',
                success: success,
                response_time: responseTime,
                ignition_state: success ? data.ignition_state : null
              });
              break;
            case controllerTTypes.MessageType.UPGRADE_STATE_REQ:
              // recvmsg.mType = UPGRADE_STATE_DUMP
              process.send({
                name: topology.name,
                type: 'upgrade_state',
                success: success,
                response_time: responseTime,
                upgradeState: success ? data.upgradeState : null
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });
        const aggrProxy = new AggregatorProxy(topology.aggregator_ip);
        // request the old and new structures until everyone is on the latest
        // don't pre-fetch routing
/*        aggrProxy.sendAggrMsgType(
          aggregatorTTypes.AggrMessageType.GET_STATUS_REPORT,
          '\0'
        );*/
        // DISABLED due to high cpu in sjc
/*        aggrProxy.on('event', (type, success, responseTime, data) => {
          switch (type) {
            case aggregatorTTypes.AggrMessageType.GET_STATUS_REPORT:
              process.send({
                name: topology.name,
                type: 'aggr_status_report_update',
                success: success,
                response_time: responseTime,
                status_report: success ? data.status_report : null
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });*/
      });
      break;
    case 'scan_poll':
      msg.topologies.forEach(topology => {
        const ctrlProxy = new ControllerProxy(topology.controller_ip);
        var getScanStatus = new controllerTTypes.GetScanStatus();
        getScanStatus.isConcise = false;
        ctrlProxy.sendCtrlMsgType(
          controllerTTypes.MessageType.GET_SCAN_STATUS,
          thriftSerialize(getScanStatus)
        );
        ctrlProxy.on('event', (type, success, responseTime, data) => {
          switch (type) {
            case controllerTTypes.MessageType.GET_SCAN_STATUS:
              // this clears the scan memory from the controller
              let clearScanEnable = true; // for development
              if (clearScanEnable) {
              if (success && Object.keys(data.scan_status.scans).length !== 0) {
                var resetScanStatus = new controllerTTypes.ResetScanStatus();
                resetScanStatus.tokenFrom = Math.min.apply(
                  null,
                  Object.keys(data.scan_status.scans)
                );
                resetScanStatus.tokenTo = Math.max.apply(
                  null,
                  Object.keys(data.scan_status.scans)
                );
                const ctrlProxy2 = new ControllerProxy(topology.controller_ip);
                ctrlProxy2.sendCtrlMsgType(
                  controllerTTypes.MessageType.RESET_SCAN_STATUS,
                  thriftSerialize(resetScanStatus)
                );
                ctrlProxy2.on('event', (type, success, responseTime, data) => {
                  switch (type) {
                    case controllerTTypes.MessageType.RESET_SCAN_STATUS:
                      if (!success) {
                        console.error('Error resetting scan status', data);
                      }
                      break;
                    default:
                      console.error('Unhandled message type', type);
                  }
                });
              }}
              process.send({
                name: topology.name,
                type: 'scan_status',
                success: success,
                scan_status: success ? data.scan_status : null
              });
              break;
            default:
              console.error('Unhandled message type', type);
          }
        });
      });
      break;
    default:
      console.error('No handler for msg type', msg.type);
  }
});

const command2MsgType = {
  setLinkStatus: controllerTTypes.MessageType.SET_LINK_STATUS_REQ,
  addLink: controllerTTypes.MessageType.ADD_LINK,
  delLink: controllerTTypes.MessageType.DEL_LINK,
  addNode: controllerTTypes.MessageType.ADD_NODE,
  delNode: controllerTTypes.MessageType.DEL_NODE,
  addSite: controllerTTypes.MessageType.ADD_SITE,
  delSite: controllerTTypes.MessageType.DEL_SITE,
  rebootNode: controllerTTypes.MessageType.REBOOT_REQUEST,
  editSite: controllerTTypes.MessageType.EDIT_SITE,
  editNode: controllerTTypes.MessageType.EDIT_NODE,
  setMac: controllerTTypes.MessageType.SET_NODE_MAC,
  setMacList: controllerTTypes.MessageType.SET_NODE_MAC_LIST,
  getIgnitionState: controllerTTypes.MessageType.GET_IGNITION_STATE,
  setNetworkIgnitionState: controllerTTypes.MessageType.SET_IGNITION_PARAMS,
  setLinkIgnitionState: controllerTTypes.MessageType.SET_IGNITION_PARAMS,

  // upgrade requests (sent to controller)
  resetStatus: controllerTTypes.MessageType.UPGRADE_GROUP_REQ,
  prepareUpgrade: controllerTTypes.MessageType.UPGRADE_GROUP_REQ,
  commitUpgrade: controllerTTypes.MessageType.UPGRADE_GROUP_REQ,
  commitUpgradePlan: controllerTTypes.MessageType.UPGRADE_COMMIT_PLAN_REQ,
  abortUpgrade: controllerTTypes.MessageType.UPGRADE_ABORT_REQ,

  // upgrade images
  addUpgradeImage: controllerTTypes.MessageType.UPGRADE_ADD_IMAGE_REQ,
  deleteUpgradeImage: controllerTTypes.MessageType.UPGRADE_DEL_IMAGE_REQ,
  listUpgradeImages: controllerTTypes.MessageType.UPGRADE_LIST_IMAGES_REQ,

  // config management
  getBaseConfig: controllerTTypes.MessageType.GET_CTRL_CONFIG_BASE_REQ,
  getNetworkOverrideConfig:
    controllerTTypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ,
  getNodeOverrideConfig:
    controllerTTypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ,
  setNetworkOverrideConfig:
    controllerTTypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ,
  setNodeOverrideConfig:
    controllerTTypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ
};

var msgType2Params = {};
msgType2Params[controllerTTypes.MessageType.GET_TOPOLOGY] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_REFRESH'
};
msgType2Params[controllerTTypes.MessageType.GET_STATUS_DUMP] = {
  recvApp: 'ctrl-app-STATUS_APP',
  nmsAppId: 'NMS_WEB_STATUS_REFRESH'
};
msgType2Params[controllerTTypes.MessageType.SET_LINK_STATUS_REQ] = {
  recvApp: 'ctrl-app-IGNITION_APP',
  nmsAppId: 'NMS_WEB_IGN_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.ADD_LINK] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.DEL_LINK] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.ADD_NODE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.DEL_NODE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.EDIT_NODE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.ADD_SITE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.DEL_SITE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.EDIT_SITE] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.REBOOT_REQUEST] = {
  recvApp: 'ctrl-app-STATUS_APP',
  nmsAppId: 'NMS_WEB_STATUS_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.SET_NODE_MAC] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.SET_NODE_MAC_LIST] = {
  recvApp: 'ctrl-app-TOPOLOGY_APP',
  nmsAppId: 'NMS_WEB_TOPO_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.GET_IGNITION_STATE] = {
  recvApp: 'ctrl-app-IGNITION_APP',
  nmsAppId: 'NMS_WEB_IGN_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.SET_IGNITION_PARAMS] = {
  recvApp: 'ctrl-app-IGNITION_APP',
  nmsAppId: 'NMS_WEB_IGN_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.GET_SCAN_STATUS] = {
  recvApp: 'ctrl-app-SCAN_APP',
  nmsAppId: 'NMS_WEB_SCAN'
};
msgType2Params[controllerTTypes.MessageType.RESET_SCAN_STATUS] = {
  recvApp: 'ctrl-app-SCAN_APP',
  nmsAppId: 'NMS_WEB_SCAN'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_GROUP_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_COMMIT_PLAN_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_ABORT_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_STATE_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_ADD_IMAGE_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_DEL_IMAGE_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};
msgType2Params[controllerTTypes.MessageType.UPGRADE_LIST_IMAGES_REQ] = {
  recvApp: 'ctrl-app-UPGRADE_APP',
  nmsAppId: 'NMS_WEB_UPGRADE'
};

msgType2Params[aggregatorTTypes.AggrMessageType.START_IPERF] = {
  recvApp: 'aggr-app-TRAFFIC_APP',
  nmsAppId: 'NMS_WEB_TRAFFIC'
};
msgType2Params[aggregatorTTypes.AggrMessageType.STOP_IPERF] = {
  recvApp: 'aggr-app-TRAFFIC_APP',
  nmsAppId: 'NMS_WEB_TRAFFIC'
};
msgType2Params[aggregatorTTypes.AggrMessageType.GET_IPERF_STATUS] = {
  recvApp: 'aggr-app-TRAFFIC_APP',
  nmsAppId: 'NMS_WEB_TRAFFIC'
};

// config management mappings
msgType2Params[controllerTTypes.MessageType.GET_CTRL_CONFIG_BASE_REQ] = {
  recvApp: 'ctrl-app-CONFIG_APP',
  nmsAppId: 'NMS_WEB_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ] = {
  recvApp: 'ctrl-app-CONFIG_APP',
  nmsAppId: 'NMS_WEB_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.GET_CTRL_CONFIG_NODE_OVERRIDES_REQ] = {
  recvApp: 'ctrl-app-CONFIG_APP',
  nmsAppId: 'NMS_WEB_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ] = {
  recvApp: 'ctrl-app-CONFIG_APP',
  nmsAppId: 'NMS_WEB_CONFIG'
};
msgType2Params[controllerTTypes.MessageType.SET_CTRL_CONFIG_NODE_OVERRIDES_REQ] = {
  recvApp: 'ctrl-app-CONFIG_APP',
  nmsAppId: 'NMS_WEB_CONFIG'
};

const thriftSerialize = struct => {
  var result;

  var transport = new thrift.TFramedTransport(null, function (byteArray) {
    // Flush puts a 4-byte header, which needs to be parsed/sliced.
    byteArray = byteArray.slice(4);
    result = byteArray;
  });
  var protocol = new thrift.TCompactProtocol(transport);

  struct.write(protocol);
  // Flushing the transport runs the callback, where we set result
  transport.flush();
  return result;
};

const sendCtrlMsgSync = (msg, minion, res) => {
  if (!msg.type) {
    console.error('sendCtrlMsgSync: Received unknown message', msg);
  }

  const send = struct => {
    var byteArray = thriftSerialize(struct);
    const ctrlProxy = new ControllerProxy(msg.topology.controller_ip);
    ctrlProxy.sendMsgTypeSync(
      command2MsgType[msg.type],
      byteArray,
      minion,
      res
    );
  };

  // prepare MSG body first, then send msg syncronously
  switch (msg.type) {
    case 'setLinkStatus':
      var setLinkStatusReq = new controllerTTypes.SetLinkStatusReq();
      setLinkStatusReq.initiatorNodeName = msg.nodeA;
      setLinkStatusReq.responderNodeName = msg.nodeZ;
      setLinkStatusReq.action = msg.status
        ? controllerTTypes.LinkActionType.LINK_UP
        : controllerTTypes.LinkActionType.LINK_DOWN;
      send(setLinkStatusReq);
      break;
    case 'addLink':
      var addLinkReq = new controllerTTypes.AddLink();
      var link = new topologyTTypes.Link();
      link.name = msg.linkName;
      link.a_node_name = msg.nodeA;
      link.z_node_name = msg.nodeZ;
      link.link_type = msg.linkType;
      link.is_alive = 0;
      link.linkup_attempts = 0;
      addLinkReq.link = link;
      send(addLinkReq);
      break;
    case 'addNode':
      var addNodeReq = new controllerTTypes.AddNode();
      var node = new topologyTTypes.Node();
      var golay = new topologyTTypes.GolayIdx();

      golay.txGolayIdx = msg.node.txGolayIdx;
      golay.rxGolayIdx = msg.node.rxGolayIdx;

      node.name = msg.node.name;
      node.node_type =
        msg.node.type === 'DN'
          ? topologyTTypes.NodeType.DN
          : topologyTTypes.NodeType.CN;
      node.is_primary = msg.node.is_primary;
      node.mac_addr = msg.node.mac_addr;
      node.pop_node = msg.node.is_pop;
      node.polarity =
        msg.node.polarity === 'ODD'
          ? topologyTTypes.PolarityType.ODD
          : topologyTTypes.PolarityType.EVEN;
      node.golay_idx = golay;
      node.site_name = msg.node.site_name;
      node.ant_azimuth = msg.node.ant_azimuth;
      node.ant_elevation = msg.node.ant_elevation;
      node.has_cpe = msg.node.has_cpe;

      addNodeReq.node = node;
      send(addNodeReq);
      break;
    case 'addSite':
      var addSiteReq = new controllerTTypes.AddSite();
      var site = new topologyTTypes.Site();
      var location = new topologyTTypes.Location();

      location.latitude = msg.site.lat;
      location.longitude = msg.site.long;
      location.altitude = msg.site.alt;

      site.name = msg.site.name;
      site.location = location;
      addSiteReq.site = site;
      send(addSiteReq);
      break;
    case 'editSite':
      var editSiteReq = new controllerTTypes.EditSite();
      editSiteReq.siteName = msg.siteName;
      editSiteReq.newSite = new topologyTTypes.Site();
      editSiteReq.newSite.name = msg.newSiteName;
      send(editSiteReq);
      break;
    case 'editNode':
      var editNodeReq = new controllerTTypes.EditNode();
      editNodeReq.nodeName = msg.nodeName;
      editNodeReq.newNode = new topologyTTypes.Node();
      editNodeReq.newNode.name = msg.newNodeName;
      send(editNodeReq);
      break;
    case 'delLink':
      var delLinkReq = new controllerTTypes.DelLink();
      delLinkReq.aNodeName = msg.nodeA;
      delLinkReq.zNodeName = msg.nodeZ;
      delLinkReq.forceDelete = msg.forceDelete;
      send(delLinkReq);
      break;
    case 'delNode':
      var delNodeReq = new controllerTTypes.DelNode();
      delNodeReq.nodeName = msg.node;
      delNodeReq.force = msg.forceDelete;
      send(delNodeReq);
      break;
    case 'delSite':
      var delSiteReq = new controllerTTypes.DelSite();
      delSiteReq.siteName = msg.site;
      send(delSiteReq);
      break;
    case 'rebootNode':
      var rebootNode = new controllerTTypes.RebootReq();
      rebootNode.force = msg.forceReboot;
      rebootNode.nodes = msg.nodes;
      rebootNode.secondsToReboot = msg.secondsToReboot;
      send(rebootNode);
      break;
    case 'setMac':
      var setNodeMacReq = new controllerTTypes.SetNodeMac();
      setNodeMacReq.nodeName = msg.node;
      setNodeMacReq.nodeMac = msg.mac;
      setNodeMacReq.force = msg.force;
      send(setNodeMacReq);
      break;
    case 'setMacList':
      var setNodeMacListReq = new controllerTTypes.SetNodeMacList();
      let nodeMacList = [];
      Object.keys(msg.nodeToMac).forEach(nodeName => {
        let macAddr = msg.nodeToMac[nodeName];
        let setNodeMacReq = new controllerTTypes.SetNodeMac();
        setNodeMacReq.nodeName = nodeName;
        setNodeMacReq.nodeMac = macAddr;
        nodeMacList.push(setNodeMacReq);
      });
      setNodeMacListReq.setNodeMacList = nodeMacList;
      setNodeMacListReq.force = msg.force;
      send(setNodeMacListReq);
      break;
    case 'getIgnitionState':
      var getIgnitionStateReq = new controllerTTypes.GetIgnitionState();
      send(getIgnitionStateReq);
      break;
    case 'setNetworkIgnitionState':
      let setIgnitionParamsReq = new controllerTTypes.IgnitionParams();
      setIgnitionParamsReq.enable = msg.state;
      send(setIgnitionParamsReq);
      break;
    case 'setLinkIgnitionState':
      let setLinkIgnitionParamsReq = new controllerTTypes.IgnitionParams();
      setLinkIgnitionParamsReq.linkAutoIgnite = {};
      setLinkIgnitionParamsReq.linkAutoIgnite[msg.linkName] = msg.state;
      send(setLinkIgnitionParamsReq);
      break;
    case 'resetStatus':
      var upgradeReqParams = new controllerTTypes.UpgradeReq();
      upgradeReqParams.urType =
        controllerTTypes.UpgradeReqType.RESET_STATUS;
      upgradeReqParams.upgradeReqId = msg.requestId;
      // then set up the group upgrade req
      var upgradeGroupReqParams = new controllerTTypes.UpgradeGroupReq();
      upgradeGroupReqParams.urReq = upgradeReqParams;
      upgradeGroupReqParams.ugType = controllerTTypes.UpgradeGroupType.NODES;
      upgradeGroupReqParams.nodes = msg.nodes;
      send(upgradeGroupReqParams);
      break;
    case 'prepareUpgrade':
      // first set up the upgrade req that the controller sends to minions
      var upgradeReqParams = new controllerTTypes.UpgradeReq();
      upgradeReqParams.urType =
        controllerTTypes.UpgradeReqType.PREPARE_UPGRADE;
      upgradeReqParams.upgradeReqId = msg.requestId;
      upgradeReqParams.md5 = msg.md5;
      upgradeReqParams.imageUrl = msg.imageUrl;

      if (msg.isHttp) {
        upgradeReqParams.downloadAttempts = msg.downloadAttempts;
      } else {
        var torrentParams = new controllerTTypes.UpgradeTorrentParams();
        const {
          downloadTimeout,
          downloadLimit,
          uploadLimit,
          maxConnections
        } = msg.torrentParams;
        torrentParams.downloadTimeout = downloadTimeout;
        torrentParams.downloadLimit = downloadLimit;
        torrentParams.uploadLimit = uploadLimit;
        torrentParams.maxConnections = maxConnections;

        upgradeReqParams.torrentParams = torrentParams;
      }

      // then set up the group upgrade req
      var upgradeGroupReqParams = new controllerTTypes.UpgradeGroupReq();
      upgradeGroupReqParams.ugType = controllerTTypes.UpgradeGroupType.NETWORK;

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
      var upgradeCommitReqParams = new controllerTTypes.UpgradeReq();
      upgradeCommitReqParams.urType = controllerTTypes.UpgradeReqType.COMMIT_UPGRADE;
      upgradeCommitReqParams.upgradeReqId = msg.requestId;
      upgradeCommitReqParams.scheduleToCommit = msg.scheduleToCommit;

      var upgradeGroupCommitReqParams = new controllerTTypes.UpgradeGroupReq();
      (upgradeGroupCommitReqParams.ugType = msg.upgradeGroupType);
      (upgradeGroupCommitReqParams.nodes = msg.nodes);
      upgradeGroupCommitReqParams.excludeNodes = msg.excludeNodes;

      upgradeGroupCommitReqParams.urReq = upgradeCommitReqParams;
      upgradeGroupCommitReqParams.timeout = msg.timeout;
      upgradeGroupCommitReqParams.skipFailure = msg.skipFailure;
      upgradeGroupCommitReqParams.version = '';
      upgradeGroupCommitReqParams.skipLinks = msg.skipLinks;
      upgradeGroupCommitReqParams.limit = msg.limit;

      send(upgradeGroupCommitReqParams);
      break;
    case 'commitUpgradePlan':
      var upgradeCommitPlanReq = new controllerTTypes.UpgradeCommitPlanReq();
      upgradeCommitPlanReq.limit = msg.limit;
      upgradeCommitPlanReq.excludeNodes = msg.excludeNodes;
      send(upgradeCommitPlanReq);
      break;
    case 'abortUpgrade':
      var abortUpgradeParams = new controllerTTypes.UpgradeAbortReq();
      abortUpgradeParams.abortAll = msg.abortAll;
      abortUpgradeParams.reqIds = msg.reqIds;

      send(abortUpgradeParams);
      break;
    case 'listUpgradeImages':
      var listUpgradeImagesParams = new controllerTTypes.UpgradeListImagesReq();
      send(listUpgradeImagesParams);

      break;
    case 'addUpgradeImage':
      var addUpgradeImageParams = new controllerTTypes.UpgradeAddImageReq();
      addUpgradeImageParams.imageUrl = msg.imagePath;
      send(addUpgradeImageParams);

      break;
    case 'deleteUpgradeImage':
      var delUpgradeImageParams = new controllerTTypes.UpgradeDelImageReq();
      delUpgradeImageParams.name = msg.name;
      send(delUpgradeImageParams);

      break;
    case 'getBaseConfig':
      var getCtrlConfigBaseReqParams = new controllerTTypes.GetCtrlConfigBaseReq();
      getCtrlConfigBaseReqParams.swVersions = msg.imageVersions;
      send(getCtrlConfigBaseReqParams);

      break;
    case 'getNetworkOverrideConfig':
      var getNetworkOverrideParams = new controllerTTypes.GetCtrlConfigNetworkOverridesReq();
      send(getNetworkOverrideParams);

      break;
    case 'getNodeOverrideConfig':
      var getNodeOverrideParams = new controllerTTypes.GetCtrlConfigNodeOverridesReq();
      getNodeOverrideParams.nodes = [];
      send(getNodeOverrideParams);

      break;
    case 'setNetworkOverrideConfig':
      var setNetworkOverrideParams = new controllerTTypes.SetCtrlConfigNetworkOverridesReq();
      setNetworkOverrideParams.overrides = JSON.stringify(msg.config);
      send(setNetworkOverrideParams);

      break;
    case 'setNodeOverrideConfig':
      var setNodeOverrideParams = new controllerTTypes.SetCtrlConfigNodeOverridesReq();
      setNodeOverrideParams.overrides = JSON.stringify(msg.config);
      send(setNodeOverrideParams);

      break;
    default:
      console.error('sendCtrlMsgSync: No handler for msg type', msg.type);
      res.status(500).send('FAIL');
  }
};

class ControllerProxy extends EventEmitter {
  constructor (controllerIp) {
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
  sendCtrlMsgType (msgType, msgBody) {
    var sendMsg = new controllerTTypes.Message();
    sendMsg.mType = msgType;
    sendMsg.value = msgBody;
    var recvMsg = new controllerTTypes.Message();

    let zmqRandId = parseInt(Math.random() * 1000);
    let nmsAppId = msgType2Params[msgType].nmsAppId + zmqRandId;
    // time the response
    this.sendCtrlMsg(
      sendMsg,
      recvMsg,
      nmsAppId,
      msgType2Params[msgType].recvApp,
      '',
      (tProtocol, tTransport) => {
        const endTimer = new Date();
        switch (msgType) {
          case controllerTTypes.MessageType.GET_TOPOLOGY:
            var receivedTopology = new topologyTTypes.Topology();
            receivedTopology.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { topology: receivedTopology }
            );
            break;
          case controllerTTypes.MessageType.GET_STATUS_DUMP:
            var receivedStatusDumps = new controllerTTypes.StatusDump();
            receivedStatusDumps.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { status_dump: receivedStatusDumps }
            );
            break;
          case controllerTTypes.MessageType.GET_SCAN_STATUS:
            var receivedScanStatus = new controllerTTypes.ScanStatus();
            receivedScanStatus.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { scan_status: receivedScanStatus }
            );
            break;
          case controllerTTypes.MessageType.RESET_SCAN_STATUS:
            var receivedAck = new controllerTTypes.E2EAck();
            receivedAck.read(tProtocol);
            this.emit(
              'event',
              msgType,
              receivedAck.success,
              endTimer - this.start_timer,
              { msg: receivedAck.message }
            );
            break;
          case controllerTTypes.MessageType.GET_IGNITION_STATE:
            var ignitionState = new controllerTTypes.IgnitionState();
            ignitionState.read(tProtocol);
            this.emit('event', msgType, true, endTimer - this.start_timer, {
              ignition_state: ignitionState
            });
            break;
          case controllerTTypes.MessageType.UPGRADE_STATE_REQ:
            // recvmsg.mType = UPGRADE_STATE_DUMP
            var stateDump = new controllerTTypes.UpgradeStateDump();
            stateDump.read(tProtocol);
            this.emit('event', msgType, true, endTimer - this.start_timer, {
              upgradeState: stateDump
            });
            break;
          default:
            console.error(
              '[controller] No receive handler defined for',
              msgType
            );
        }
      },
      () => {
        // error condition
        const endTimer = new Date();
        this.emit(
          'event',
          msgType,
          false /* success */,
          endTimer - this.start_timer,
          { timeout: false }
        );
      }
    );
  }

  sendMsgType (msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new controllerTTypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new controllerTTypes.Message();

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
            case controllerTTypes.MessageType.SET_LINK_STATUS_REQ:
            case controllerTTypes.MessageType.ADD_LINK:
            case controllerTTypes.MessageType.ADD_NODE:
            case controllerTTypes.MessageType.ADD_SITE:
            case controllerTTypes.MessageType.DEL_LINK:
            case controllerTTypes.MessageType.DEL_NODE:
            case controllerTTypes.MessageType.DEL_SITE:
            case controllerTTypes.MessageType.EDIT_NODE:
            case controllerTTypes.MessageType.EDIT_SITE:
            case controllerTTypes.MessageType.REBOOT_REQUEST:
            case controllerTTypes.MessageType.SET_NODE_MAC:
            case controllerTTypes.MessageType.SET_NODE_MAC_LIST:
            case controllerTTypes.MessageType.SET_IGNITION_PARAMS:
            case controllerTTypes.MessageType.UPGRADE_GROUP_REQ:
            case controllerTTypes.MessageType.UPGRADE_ABORT_REQ:
            case controllerTTypes.MessageType.UPGRADE_ADD_IMAGE_REQ:
            case controllerTTypes.MessageType.UPGRADE_DEL_IMAGE_REQ:
            case controllerTTypes.MessageType
              .SET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
            case controllerTTypes.MessageType
              .SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              var receivedAck = new controllerTTypes.E2EAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({ type: 'ack', msg: receivedAck.message });
              } else {
                reject(receivedAck.message);
              }
              break;
            case controllerTTypes.MessageType.UPGRADE_COMMIT_PLAN_REQ:
              var commitPlan = new controllerTTypes.UpgradeCommitPlan();
              commitPlan.read(tProtocol);
              resolve({ type: 'msg', msg: commitPlan });
              break;
            case controllerTTypes.MessageType.GET_IGNITION_STATE:
              var ignitionState = new controllerTTypes.IgnitionState();
              ignitionState.read(tProtocol);
              resolve({ type: 'msg', msg: ignitionState });
              break;
            case controllerTTypes.MessageType.GET_CTRL_CONFIG_BASE_REQ:
              let baseConfig = new controllerTTypes.GetCtrlConfigBaseResp();
              baseConfig.read(tProtocol);
              resolve({ type: 'msg', msg: baseConfig });
              break;
            case controllerTTypes.MessageType
              .GET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
              let nodeOverrideConfig = new controllerTTypes.GetCtrlConfigNodeOverridesResp();
              nodeOverrideConfig.read(tProtocol);
              resolve({ type: 'msg', msg: nodeOverrideConfig });
              break;
            case controllerTTypes.MessageType
              .GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              let networkOverrideConfig = new controllerTTypes.GetCtrlConfigNetworkOverridesResp();
              networkOverrideConfig.read(tProtocol);
              resolve({ type: 'msg', msg: networkOverrideConfig });
              break;
            default:
              console.error(
                '[controller] No receive handler defined for',
                msgType
              );
          }
        },
        errMsg => {
          reject(errMsg);
        }
      );
    });

    ctrlPromise
      .then(msg => {
        if (msg.type === 'ack') {
          let result = { success: true };
          res.status(200).end(JSON.stringify(result));
        } else {
          res.json(msg.msg);
        }
      })
      .catch(failMessage => {
        let result = {
          success: false,
          error: failMessage
        };
        res.status(500).end(JSON.stringify(result));
        res.end();
      });
  }

  sendMsgTypeSync (msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new controllerTTypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new controllerTTypes.Message();

      let zmqRandId = parseInt(Math.random() * 1000);
      this.sendCtrlMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId + zmqRandId,
        msgType2Params[msgType].recvApp,
        minion,
        (tProtocol, tTransport) => {
          switch (msgType) {
            case controllerTTypes.MessageType.SET_LINK_STATUS_REQ:
            case controllerTTypes.MessageType.ADD_LINK:
            case controllerTTypes.MessageType.ADD_NODE:
            case controllerTTypes.MessageType.ADD_SITE:
            case controllerTTypes.MessageType.DEL_LINK:
            case controllerTTypes.MessageType.DEL_NODE:
            case controllerTTypes.MessageType.DEL_SITE:
            case controllerTTypes.MessageType.EDIT_NODE:
            case controllerTTypes.MessageType.EDIT_SITE:
            case controllerTTypes.MessageType.REBOOT_REQUEST:
            case controllerTTypes.MessageType.SET_NODE_MAC:
            case controllerTTypes.MessageType.SET_NODE_MAC_LIST:
            case controllerTTypes.MessageType.SET_IGNITION_PARAMS:
            case controllerTTypes.MessageType.UPGRADE_GROUP_REQ:
            case controllerTTypes.MessageType.UPGRADE_ABORT_REQ:
            case controllerTTypes.MessageType.UPGRADE_ADD_IMAGE_REQ:
            case controllerTTypes.MessageType.UPGRADE_DEL_IMAGE_REQ:
            case controllerTTypes.MessageType
              .SET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
            case controllerTTypes.MessageType
              .SET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              var receivedAck = new controllerTTypes.E2EAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({ type: 'ack', msg: receivedAck.message });
              } else {
                reject(receivedAck.message);
              }
              break;
            case controllerTTypes.MessageType.GET_IGNITION_STATE:
              var ignitionState = new controllerTTypes.IgnitionState();
              ignitionState.read(tProtocol);
              resolve({ type: 'msg', msg: ignitionState });
              break;
            case controllerTTypes.MessageType.UPGRADE_LIST_IMAGES_REQ:
              var upgradeImages = new controllerTTypes.UpgradeListImagesResp();
              upgradeImages.read(tProtocol);
              resolve({ type: 'msg', msg: upgradeImages });
              break;
            case controllerTTypes.MessageType.GET_CTRL_CONFIG_BASE_REQ:
              let baseConfig = new controllerTTypes.GetCtrlConfigBaseResp();
              baseConfig.read(tProtocol);
              resolve({ type: 'msg', msg: baseConfig });
              break;
            case controllerTTypes.MessageType
              .GET_CTRL_CONFIG_NODE_OVERRIDES_REQ:
              let nodeOverrideConfig = new controllerTTypes.GetCtrlConfigNodeOverridesResp();
              nodeOverrideConfig.read(tProtocol);
              resolve({ type: 'msg', msg: nodeOverrideConfig });
              break;
            case controllerTTypes.MessageType
              .GET_CTRL_CONFIG_NETWORK_OVERRIDES_REQ:
              let networkOverrideConfig = new controllerTTypes.GetCtrlConfigNetworkOverridesResp();
              networkOverrideConfig.read(tProtocol);
              resolve({ type: 'msg', msg: networkOverrideConfig });
              break;
            case controllerTTypes.MessageType.UPGRADE_COMMIT_PLAN_REQ:
              let upgradeCommitPlan = new controllerTTypes.UpgradeCommitPlan();
              upgradeCommitPlan.read(tProtocol);
              resolve({ type: 'msg', msg: upgradeCommitPlan });
              break;
            default:
              console.error(
                '[controller] No receive handler defined for',
                msgType
              );
          }
        },
        errMsg => {
          reject(errMsg);
        }
      );
    });

    ctrlPromise
      .then(msg => {
        if (msg.type === 'ack') {
          res.writeHead(200, msg.msg, { 'content-type': 'text/plain' });
          res.end();
        } else {
          res.json(msg.msg);
          //        res.writeHead(200, msg.msg, {'content-type' : 'application/json'});
          // res.end();
        }
      })
      .catch(failMessage => {
        res.writeHead(500, failMessage, { 'content-type': 'text/plain' });
        res.end();
      });
  }

  /*
   * Send any message to the controller.
   */
  sendCtrlMsg (
    sendMsg,
    recvMsg,
    sendAppName,
    recvAppName,
    minion,
    recvCb,
    errCb
  ) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.controller_ip + ']:17077');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII')
      );
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function (err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb(err.message);
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function (byteArray) {
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
      errCb('Timeout');
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
  constructor (aggregatorIp) {
    super();
    this.aggregator_ip = aggregatorIp;
  }

  sendMsgType (msgType, msgBody, minion, res) {
    let aggrPromise = new Promise((resolve, reject) => {
      var sendMsg = new aggregatorTTypes.AggrMessage();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new aggregatorTTypes.AggrMessage();

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
            case aggregatorTTypes.AggrMessageType.GET_IPERF_STATUS:
              var receivedStatus = new aggregatorTTypes.AggrIperfStatusReport();
              receivedStatus.read(tProtocol);
              resolve({ type: 'msg', msg: receivedStatus });
              break;
            case aggregatorTTypes.AggrMessageType.START_IPERF:
              var receivedAck = new aggregatorTTypes.AggrAck();
              receivedAck.read(tProtocol);
              if (receivedAck.success) {
                resolve({ type: 'ack', msg: receivedAck.message });
              } else {
                reject(receivedAck.message);
              }
              break;
            default:
              console.error(
                '[aggregator] No receive handler defined for',
                msgType
              );
          }
        },
        errMsg => {
          reject(errMsg);
        }
      );
    });

    aggrPromise
      .then(msg => {
        if (msg.type === 'ack') {
          let result = { success: true, message: msg.msg };
          res.status(200).end(JSON.stringify(result));
        } else {
          res.json(msg.msg);
        }
      })
      .catch(failMessage => {
        let result = {
          success: false,
          error: failMessage
        };
        res.status(500).end(JSON.stringify(result));
        res.end();
      });
  }

  sendAggrMsg (
    sendMsg,
    recvMsg,
    sendAppName,
    recvAppName,
    minion,
    recvCb,
    errCb
  ) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.aggregator_ip + ']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII')
      );
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function (err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb(err.message);
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function (byteArray) {
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
      errCb('Timeout');
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
  sendAggrMsgType (msgType, msgBody) {
    var sendMsg = new aggregatorTTypes.AggrMessage();
    sendMsg.mType = msgType;
    sendMsg.value = msgBody;
    var recvMsg = new aggregatorTTypes.AggrMessage();
    let recvApp, nmsAppIdentity;
    // determine receiver app
    switch (msgType) {
      case aggregatorTTypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED:
      case aggregatorTTypes.AggrMessageType.GET_STATUS_REPORT:
      case aggregatorTTypes.AggrMessageType.GET_ROUTING_REPORT:
        recvApp = 'aggr-app-STATUS_APP';
        nmsAppIdentity = 'NMS_WEB_AGGR_STATUS_REFRESH';
        break;
      case aggregatorTTypes.AggrMessageType.START_IPERF:
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
          case aggregatorTTypes.AggrMessageType.GET_STATUS_REPORT:
            var receivedStatusReport = new aggregatorTTypes.AggrStatusReport();
            receivedStatusReport.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { status_report: receivedStatusReport }
            );
            break;
          case aggregatorTTypes.AggrMessageType.GET_ROUTING_REPORT:
            var receivedRoutingReport = new aggregatorTTypes.AggrRoutingReport();
            receivedRoutingReport.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { routing_report: receivedRoutingReport }
            );
            break;
          case aggregatorTTypes.AggrMessageType.GET_STATUS_DUMP_DEPRECATED:
            var receivedStatusDump = new aggregatorTTypes.AggrStatusDump_Deprecated();
            receivedStatusDump.read(tProtocol);
            // emit a successful event
            this.emit(
              'event',
              msgType,
              true /* success */,
              endTimer - this.start_timer,
              { status_dump: receivedStatusDump }
            );
            break;
          default:
            console.error(
              '[aggregator] No receive handler defined for',
              msgType
            );
        }
      },
      () => {
        // error condition
        const endTimer = new Date();
        this.emit(
          'event',
          msgType,
          false /* success */,
          endTimer - this.start_timer,
          { timeout: false }
        );
      }
    );
  }

  /*
   * Send any message to the controller.
   */
  sendMsg (sendMsg, recvMsg, sendAppName, recvAppName, recvCb, errCb) {
    const dealer = zmq.socket('dealer');
    dealer.identity = sendAppName;
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + this.aggregator_ip + ']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeoutTimer);
      // Deserialize Message to get mType
      let tTransport = new thrift.TFramedTransport(msg);
      let tProtocol = new thrift.TCompactProtocol(tTransport);
      recvMsg.read(tProtocol);
      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(recvMsg.value, 'ASCII')
      );
      tProtocol = new thrift.TCompactProtocol(tTransport);
      // run callback
      recvCb(tProtocol, tTransport);
      // close connection
      dealer.close();
    });

    dealer.on('error', function (err) {
      clearTimeout(timeoutTimer);
      console.error(err);
      errCb();
      dealer.close();
    });

    const transport = new thrift.TFramedTransport(null, function (byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
      byteArray = byteArray.slice(4);
      dealer.send('', zmq.ZMQ_SNDMORE);
      dealer.send(recvAppName, zmq.ZMQ_SNDMORE);
      dealer.send(sendAppName, zmq.ZMQ_SNDMORE);
      dealer.send(byteArray);
    });
    const tProtocol = new thrift.TCompactProtocol(transport);
    // watch for connection timeouts
    const timeoutTimer = setTimeout(() => {
      const endTimer = new Date();
      this.emit(
        'event',
        sendMsg.mType,
        false /* success */,
        endTimer - this.start_timer,
        { timeout: true }
      );
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
  sendCtrlMsgSync: sendCtrlMsgSync
};
