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
  },


  getAlertsConfig: function (configs, req, res, next) {
    let topologyName = req.params[0];
    let config = {};
    let alertsConfig = {};

    for (var i = 0, len = configs.length; i < len; i++) {
      if(topologyName == configs[i].name) {
        config = configs[i];
        break;
      }
    }

    // guard against hanging
    var timeout = setTimeout(function(){
      alertsConfig = {};
      config.aggregator_online = false;
      dealer.close();
      res.status(404).end("No such topology\n");
    }, 2000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_ALERTS';
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

      tTransport = new thrift.TFramedTransport(
          Buffer.from(receivedMessage.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var alertsConfList = new Aggregator_ttypes.AggrAlertConfList();
      alertsConfList.read(tProtocol);
      alertsConfig = alertsConfList;
      config.aggregator_online = true;
      dealer.close();
      res.json(alertsConfig);
    });

    dealer.on('error', function(err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
      res.status(404).end("No such topology\n");
    });

    var transport = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);
       dealer.send("", zmq.ZMQ_SNDMORE);
       dealer.send("aggr-app-STATS_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_ALERTS", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var tProtocol = new thrift.TCompactProtocol(transport);
    var getAlertsConfigMessage = new Aggregator_ttypes.AggrMessage();
    getAlertsConfigMessage.mType = Aggregator_ttypes.AggrMessageType.GET_ALERTS_CONFIG;
    getAlertsConfigMessage.value = '\0';
    getAlertsConfigMessage.write(tProtocol);
    transport.flush();
  },

  setAlertsConfig: function (configs, req, res, next) {
    let topologyName = req.params[0];
    let alertsConfigRows = JSON.parse(req.params[1]);
    let config = {};

    for (var i = 0, len = configs.length; i < len; i++) {
      if(topologyName == configs[i].name) {
        config = configs[i];
        break;
      }
    }

    // guard against hanging
    var timeout = setTimeout(function(){
      config.aggregator_online = false;
      dealer.close();
      res.status(404).end("No such topology\n");
    }, 2000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_ALERTS';
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

      tTransport = new thrift.TFramedTransport(
          Buffer.from(receivedMessage.value, 'ASCII'));
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var ackMsg = new Aggregator_ttypes.AggrAck();
      ackMsg.read(tProtocol);
      config.aggregator_online = true;
      dealer.close();
      res.json(ackMsg);
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
       dealer.send("aggr-app-STATS_APP", zmq.ZMQ_SNDMORE);
       dealer.send("NMS_WEB_ALERTS", zmq.ZMQ_SNDMORE);
       dealer.send(byteArray);
    });

    var transport1 = new thrift.TFramedTransport(null, function(byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
       byteArray = byteArray.slice(4);

       var tProtocol = new thrift.TCompactProtocol(transport2);
       var setAlertsConfigMessage = new Aggregator_ttypes.AggrMessage();
       setAlertsConfigMessage.mType = Aggregator_ttypes.AggrMessageType.SET_ALERTS_CONFIG;
       setAlertsConfigMessage.value = byteArray;
       setAlertsConfigMessage.write(tProtocol);
       transport2.flush();
    });

    var tProtocol = new thrift.TCompactProtocol(transport1);
    var aggrAlertConfList = new Aggregator_ttypes.AggrAlertConfList();

    aggrAlertConfList.alerts = [];

    Object(alertsConfigRows).forEach(function(row) {
      var alert = new Aggregator_ttypes.AggrAlertConf();
      alert.id = row.id;
      alert.key = row.key;
      alert.threshold = row.threshold.value;
      switch (row.comp.item) {
        case "GT":
          alert.comp = Aggregator_ttypes.AggrAlertComparator.ALERT_GT;
          break;
        case "GTE":
          alert.comp = Aggregator_ttypes.AggrAlertComparator.ALERT_GTE;
          break;
        case "LT":
          alert.comp = Aggregator_ttypes.AggrAlertComparator.ALERT_LT;
          break;
        case "LTE":
          alert.comp = Aggregator_ttypes.AggrAlertComparator.ALERT_LTE;
          break;
      }
      switch (row.level.item) {
        case "Info":
          alert.level = Aggregator_ttypes.AggrAlertLevel.ALERT_INFO;
          break;
        case "Warning":
          alert.level = Aggregator_ttypes.AggrAlertLevel.ALERT_WARNING;
          break;
        case "Critical":
          alert.level = Aggregator_ttypes.AggrAlertLevel.ALERT_CRITICAL;
          break;
      }
      aggrAlertConfList.alerts.push(alert);
    });
    aggrAlertConfList.write(tProtocol);
    transport1.flush();
  }
}

module.exports = self;
