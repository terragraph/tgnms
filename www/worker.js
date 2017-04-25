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
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_TOPOLOGY);
        ctrlProxy.sendCtrlMsgType(Controller_ttypes.MessageType.GET_STATUS_DUMP);
        ctrlProxy.on('event', (type, success, response_time, data) => {
          switch (type) {
            case Controller_ttypes.MessageType.GET_TOPOLOGY:
              process.send({
                name: topology.name,
                type: 'topology_update',
                success: success,
                topology: success ? data.topology : null,
              });
              break;
            case Controller_ttypes.MessageType.GET_STATUS_DUMP:
              process.send({
                name: topology.name,
                type: 'status_dump_update',
                success: success,
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
                status_dump: success ? data.status_dump : null,
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

class ControllerProxy extends EventEmitter {
  constructor(controllerIp) {
    super();
    this.controller_ip = controllerIp;
  }
  /*
   * Send and decode the expected message based on the type.
   */
  sendCtrlMsgType(msgType) {
    var sendMsg = new Controller_ttypes.Message();
    sendMsg.mType = msgType;
    sendMsg.value = '\0';
    var recvMsg = new Controller_ttypes.Message();
    let recvApp, nmsAppIdentity;
    // determine receiver app
    switch (msgType) {
      case Controller_ttypes.MessageType.GET_TOPOLOGY:
        recvApp = 'ctrl-app-TOPOLOGY_APP';
        nmsAppIdentity = 'NMS_WEB_TOPO_REFRESH';
        break;
      case Controller_ttypes.MessageType.GET_STATUS_DUMP:
        recvApp = 'ctrl-app-STATUS_APP';
        nmsAppIdentity = 'NMS_WEB_STATUS_REFRESH';
        break;
      default:
        console.error('Unknown message type', msgType);
    }
    // time the response
    this.sendCtrlMsg(
      sendMsg,
      recvMsg,
      nmsAppIdentity,
      recvApp,
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
  sendCtrlMsg(sendMsg, recvMsg, sendAppName, recvAppName, recvCb, errCb) {
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
