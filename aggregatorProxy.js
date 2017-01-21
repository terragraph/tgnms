const zmq = require('zmq');
// thrift serialization
const thrift = require('thrift');

var Aggregator_ttypes = require('./thrift/gen-nodejs/Aggregator_types');

var self = {
  getStatusDump: function (index, configs, statusDumps) {
    let config = configs[index];
    // guard against hanging
    var timeout = setTimeout(function(){
      statusDumps[index] = {};
      config.aggregator_online = false;
      dealer.close();
    }, 2000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_STATUS';
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + config.aggregator_ip +']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeout);
      // Deserialize Message to get mType
      var tTransport = new thrift.TFramedTransport(msg);
      var tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedMessage = new Aggregator_ttypes.AggrMessage();
      receivedMessage.read(tProtocol);


      // Deserialize body
      tTransport = new thrift.TFramedTransport(
        Buffer.from(receivedMessage.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var statusDump = new Aggregator_ttypes.AggrStatusDump();
      statusDump.read(tProtocol);
      statusDumps[index] = statusDump;
      config.aggregator_online = true;
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
       dealer.send("aggr-app-STATUS_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_STATUS", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var tProtocol = new thrift.TCompactProtocol(transport);
    var statusDumpMessage = new Aggregator_ttypes.AggrMessage();
    statusDumpMessage.mType = Aggregator_ttypes.AggrMessageType.GET_STATUS_DUMP;
    statusDumpMessage.value = '\0';
    statusDumpMessage.write(tProtocol);
    transport.flush();
  }
}

module.exports = self;
