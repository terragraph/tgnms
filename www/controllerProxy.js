const zmq = require('zmq');
// thrift serialization
const thrift = require('thrift');

var Topology_ttypes = require('./thrift/gen-nodejs/Topology_types');
var Controller_ttypes = require('./thrift/gen-nodejs/Controller_types');

var self = {
  setLinkStatus: function (config, nodeA, nodeZ, status) {
    var timeout = setTimeout(function(){
      dealer.close();
    }, 4000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_CTRL';
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
      dealer.close();
    });

    dealer.on('error', function(err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
      res.status(404).end("No such topology\n");
    });

    var transport2 = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send("", zmq.ZMQ_SNDMORE);
       dealer.send("ctrl-app-IGNITION_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_CTRL", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var transport1 = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);

       var tProtocol = new thrift.TCompactProtocol(transport2);
       var setLinkStatusReqMessage = new Controller_ttypes.Message();
       setLinkStatusReqMessage.mType = Controller_ttypes.MessageType.SET_LINK_STATUS_REQ;
       setLinkStatusReqMessage.value = byteArray;
       setLinkStatusReqMessage.write(tProtocol);
       transport2.flush();
    });

    var tProtocol = new thrift.TCompactProtocol(transport1);
    var setLinkStatusReq = new Controller_ttypes.SetLinkStatusReq();
    setLinkStatusReq.initiatorNodeName = nodeA;
    setLinkStatusReq.responderNodeName = nodeZ;
    setLinkStatusReq.action = status ? Controller_ttypes.LinkActionType.LINK_UP : Controller_ttypes.LinkActionType.LINK_DOWN;
    setLinkStatusReq.write(tProtocol);
    transport1.flush();
  }
}

module.exports = self;
