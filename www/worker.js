/*
 * ZMQ controller/aggregator refresh process
 */
const ZMQ_TIMEOUT_MS = 4000;

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
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_STATUS_DUMP, '\0');
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
            default:
              console.error('Unhandled message type', type);
          }
        });
        const aggrProxy = new AggregatorProxy(topology.aggregator_ip);
        aggrProxy.sendAggrMsgType(Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP);
        aggrProxy.on('event', (type, success, response_time, data) => {
          switch (type) {
            case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP:
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
  'setMac': Controller_ttypes.MessageType.SET_NODE_MAC,
  'getIgnitionState': Controller_ttypes.MessageType.GET_IGNITION_STATE,
  'setNetworkIgnitionState': Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
  'setLinkIgnitionState': Controller_ttypes.MessageType.SET_IGNITION_PARAMS,
};

var msgType2Params = {};
msgType2Params[Controller_ttypes.MessageType.GET_TOPOLOGY] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_REFRESH'};
msgType2Params[Controller_ttypes.MessageType.GET_STATUS_DUMP] = {'recvApp': 'ctrl-app-STATUS_APP', 'nmsAppId': 'NMS_WEB_STATUS_REFRESH'};
msgType2Params[Controller_ttypes.MessageType.SET_LINK_STATUS_REQ] = {'recvApp': 'ctrl-app-IGNITION_APP', 'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_LINK] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_LINK] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_NODE] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_NODE] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.ADD_SITE] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.DEL_SITE] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.REBOOT_NODE] = {'recvApp': 'minion-app-STATUS_APP', 'nmsAppId': 'NMS_WEB_STATUS_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_NODE_MAC] = {'recvApp': 'ctrl-app-TOPOLOGY_APP', 'nmsAppId': 'NMS_WEB_TOPO_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_IGNITION_STATE] = {'recvApp': 'ctrl-app-IGNITION_APP', 'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.SET_IGNITION_PARAMS] = {'recvApp': 'ctrl-app-IGNITION_APP', 'nmsAppId': 'NMS_WEB_IGN_CONFIG'};
msgType2Params[Controller_ttypes.MessageType.GET_SCAN_STATUS] = {'recvApp': 'ctrl-app-SCAN_APP', 'nmsAppId': 'NMS_WEB_SCAN'};
msgType2Params[Controller_ttypes.MessageType.RESET_SCAN_STATUS] = {'recvApp': 'ctrl-app-SCAN_APP', 'nmsAppId': 'NMS_WEB_SCAN'};

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
    ctrlProxy.sendCtrlMsgTypeSync(command2MsgType[msg.type], byteArray, minion, res);
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
      setIgnitionParamsReq.link_auto_ignite = {}
      setIgnitionParamsReq.link_auto_ignite[msg.linkName] = msg.state;
      send(setIgnitionParamsReq);
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

    // time the response
    this.sendCtrlMsg(
      sendMsg,
      recvMsg,
      msgType2Params[msgType].nmsAppId,
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
            break;
          default:
            console.error('No receive handler defined for', msgType);
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

  sendCtrlApiMsgType(msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new Controller_ttypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new Controller_ttypes.Message();

      // time the response
      this.sendCtrlMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId,
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
            case Controller_ttypes.MessageType.REBOOT_NODE:
            case Controller_ttypes.MessageType.SET_NODE_MAC:
            case Controller_ttypes.MessageType.SET_IGNITION_PARAMS:
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
            default:
              console.error('No receive handler defined for', msgType);
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
      }
      res.status(500).end(JSON.stringify(result));
      res.end();
    });
  }

  sendCtrlMsgTypeSync(msgType, msgBody, minion, res) {
    let ctrlPromise = new Promise((resolve, reject) => {
      var sendMsg = new Controller_ttypes.Message();
      sendMsg.mType = msgType;
      sendMsg.value = msgBody;
      var recvMsg = new Controller_ttypes.Message();

      // time the response
      this.sendCtrlMsg(
        sendMsg,
        recvMsg,
        msgType2Params[msgType].nmsAppId,
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
            case Controller_ttypes.MessageType.REBOOT_NODE:
            case Controller_ttypes.MessageType.SET_NODE_MAC:
            case Controller_ttypes.MessageType.SET_IGNITION_PARAMS:
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
            default:
              console.error('No receive handler defined for', msgType);
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
  /*
   * Send and decode the expected message based on the type.
   */
  sendAggrMsgType(msgType) {
    var sendMsg = new Aggregator_ttypes.AggrMessage();
    sendMsg.mType = msgType;
    sendMsg.value = '\0';
    var recvMsg = new Aggregator_ttypes.AggrMessage();
    let recvApp, nmsAppIdentity;
    // determine receiver app
    switch (msgType) {
      case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP:
        recvApp = 'aggr-app-STATUS_APP';
        nmsAppIdentity = 'NMS_WEB_AGGR_STATUS_REFRESH';
        break;
      default:
        console.error('Unknown message type', msgType);
    }
    // time the response
    this.sendAggrMsg(
      sendMsg,
      recvMsg,
      nmsAppIdentity,
      recvApp,
      (tProtocol, tTransport) => {
        const endTimer = new Date();
        switch (msgType) {
          case Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP:
            var receivedStatusDump = new Aggregator_ttypes.AggrStatusDump();
            receivedStatusDump.read(tProtocol);
            // emit a successful event
            this.emit('event',
                      msgType,
                      true /* success */,
                      endTimer - this.start_timer,
                      { status_dump: receivedStatusDump });
            break;
          default:
            console.error('No receive handler defined for', msgType);
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
  sendAggrMsg(sendMsg, recvMsg, sendAppName, recvAppName, recvCb, errCb) {
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
