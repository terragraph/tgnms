const zmq = require('zmq');
// thrift serialization
const thrift = require('thrift');

var Topology_ttypes = require('./thrift/gen-nodejs/Topology_types');
var Controller_ttypes = require('./thrift/gen-nodejs/Controller_types');

var self = {
  getTopology: function (index, configs, receivedTopologies) {
    let config = configs[index];
    // guard against hanging
    var timeout = setTimeout(function(){
      receivedTopologies[index] = {};
      config.controller_online = false;
      dealer.close();
    }, 1000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_TOPO';
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + config.controller_ip +']:17077');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeout);
      // Deserialize Message to get mType
      var tTransport = new thrift.TFramedTransport(msg);
      var tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedMessage = new Controller_ttypes.Message();
      receivedMessage.read(tProtocol);

      // Deserialize body
      msg = msg.slice(6);
      tTransport = new thrift.TFramedTransport(msg);
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedTopology = new Topology_ttypes.Topology();
      receivedTopology.read(tProtocol);
      receivedTopologies[index] = receivedTopology;
      config.controller_online = true;
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
    });

    var transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send("", zmq.ZMQ_SNDMORE);
       dealer.send("ctrl-app-TOPOLOGY_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_TOPO", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var tProtocol = new thrift.TCompactProtocol(transport);
    var topologyReqMessage = new Controller_ttypes.Message();
    topologyReqMessage.mType = Controller_ttypes.MessageType.GET_TOPOLOGY;
    topologyReqMessage.value = '\0';
    topologyReqMessage.write(tProtocol);
    transport.flush();
  },

  getStatusDump: function (index, configs, statusDumps) {
    let config = configs[index];
    // guard against hanging
    var timeout = setTimeout(function(){
      statusDumps[index] = {};
      dealer.close();
    }, 2000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_STATUS';
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + config.controller_ip +']:17077');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeout);
      // Deserialize Message to get mType
      var tTransport = new thrift.TFramedTransport(msg);
      var tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedMessage = new Controller_ttypes.Message();
      receivedMessage.read(tProtocol);

      // Deserialize body
      msg = msg.slice(6);
      tTransport = new thrift.TFramedTransport(msg);
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var statusDump = new Controller_ttypes.StatusDump();
      statusDump.read(tProtocol);
      statusDumps[index] = statusDump;
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
    });

    var transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send("", zmq.ZMQ_SNDMORE);
       dealer.send("ctrl-app-STATUS_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_STATUS", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var tProtocol = new thrift.TCompactProtocol(transport);
    var statusDumpMessage = new Controller_ttypes.Message();
    statusDumpMessage.mType = Controller_ttypes.MessageType.GET_STATUS_DUMP;
    statusDumpMessage.value = '\0';
    statusDumpMessage.write(tProtocol);
    transport.flush();
  }
}

module.exports = self;
