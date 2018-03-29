const zmq = require('zmq');
// thrift serialization
const thrift = require('thrift');

var aggregatorTTypes = require('./thrift/gen-nodejs/Aggregator_types');

var self = {
  getAlertsConfig: function (config, req, res, next) {
    let alertsConfig = {};

    // guard against hanging
    var timeout = setTimeout(function () {
      alertsConfig = {};
      if (config.aggregator_online) {
        console.log(
          'Request to aggregator timed out on alerts config',
          config.name
        );
      }
      config.aggregator_online = false;
      dealer.close();
      res.status(404).end('No such topology\n');
    }, 4000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_ALERTS';
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + config.aggregator_ip + ']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeout);
      // Deserialize Message to get mType
      var tTransport = new thrift.TFramedTransport(msg);
      var tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedMessage = new aggregatorTTypes.AggrMessage();
      receivedMessage.read(tProtocol);

      tTransport = new thrift.TFramedTransport(
        Buffer.from(receivedMessage.value, 'ASCII')
      );
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var alertsConfList = new aggregatorTTypes.AggrAlertConfList();
      alertsConfList.read(tProtocol);
      alertsConfig = alertsConfList;
      config.aggregator_online = true;
      dealer.close();
      res.json(alertsConfig);
    });

    dealer.on('error', function (err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
      res.status(404).end('No such topology\n');
    });

    var transport = new thrift.TFramedTransport(null, function (byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
      byteArray = byteArray.slice(4);
      dealer.send('', zmq.ZMQ_SNDMORE);
      dealer.send('aggr-app-STATS_APP', zmq.ZMQ_SNDMORE);
      dealer.send('NMS_WEB_ALERTS', zmq.ZMQ_SNDMORE);
      dealer.send(byteArray);
    });

    var tProtocol = new thrift.TCompactProtocol(transport);
    var getAlertsConfigMessage = new aggregatorTTypes.AggrMessage();
    getAlertsConfigMessage.mType =
      aggregatorTTypes.AggrMessageType.GET_ALERTS_CONFIG;
    getAlertsConfigMessage.value = '\0';
    getAlertsConfigMessage.write(tProtocol);
    transport.flush();
  },

  setAlertsConfig: function (config, req, res, next) {
    let alertsConfigRows = JSON.parse(req.params[1]);

    // guard against hanging
    var timeout = setTimeout(function () {
      if (config.aggregator_online) {
        console.log(
          'Request to aggregator timed out on alerts config',
          config.name
        );
      }
      config.aggregator_online = false;
      dealer.close();
      res.status(404).end('No such topology\n');
    }, 4000);

    let dealer = zmq.socket('dealer');
    dealer.identity = 'NMS_WEB_ALERTS';
    dealer.setsockopt(zmq.ZMQ_IPV4ONLY, 0);
    dealer.setsockopt(zmq.ZMQ_LINGER, 0);
    dealer.connect('tcp://[' + config.aggregator_ip + ']:18100');
    dealer.on('message', function (receiver, senderApp, msg) {
      clearTimeout(timeout);
      // Deserialize Message to get mType
      var tTransport = new thrift.TFramedTransport(msg);
      var tProtocol = new thrift.TCompactProtocol(tTransport);
      var receivedMessage = new aggregatorTTypes.AggrMessage();
      receivedMessage.read(tProtocol);

      tTransport = new thrift.TFramedTransport(
        Buffer.from(receivedMessage.value, 'ASCII')
      );
      tProtocol = new thrift.TCompactProtocol(tTransport);
      var respMsg = new aggregatorTTypes.AggrSetAlertsConfigResp();
      respMsg.read(tProtocol);
      config.aggregator_online = true;
      dealer.close();
      res.json(respMsg);
    });

    dealer.on('error', function (err) {
      clearTimeout(timeout);
      console.error(err);
      dealer.close();
      res.status(404).end('No such topology\n');
    });

    var transport2 = new thrift.TFramedTransport(null, function (byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
      byteArray = byteArray.slice(4);
      dealer.send('', zmq.ZMQ_SNDMORE);
      dealer.send('aggr-app-STATS_APP', zmq.ZMQ_SNDMORE);
      dealer.send('NMS_WEB_ALERTS', zmq.ZMQ_SNDMORE);
      dealer.send(byteArray);
    });

    var transport1 = new thrift.TFramedTransport(null, function (byteArray) {
      // Flush puts a 4-byte header, which needs to be parsed/sliced.
      byteArray = byteArray.slice(4);

      var tProtocol = new thrift.TCompactProtocol(transport2);
      var setAlertsConfigMessage = new aggregatorTTypes.AggrMessage();
      setAlertsConfigMessage.mType =
        aggregatorTTypes.AggrMessageType.SET_ALERTS_CONFIG;
      setAlertsConfigMessage.value = byteArray;
      setAlertsConfigMessage.write(tProtocol);
      transport2.flush();
    });

    var tProtocol = new thrift.TCompactProtocol(transport1);
    var aggrAlertConfList = new aggregatorTTypes.AggrAlertConfList();

    aggrAlertConfList.alerts = [];

    Object(alertsConfigRows).forEach(function (row) {
      var alert = new aggregatorTTypes.AggrAlertConf();
      alert.id = row.id;
      alert.key = row.key;
      alert.threshold = row.threshold.value;
      switch (row.comp.item) {
        case 'GT':
          alert.comp = aggregatorTTypes.AggrAlertComparator.ALERT_GT;
          break;
        case 'GTE':
          alert.comp = aggregatorTTypes.AggrAlertComparator.ALERT_GTE;
          break;
        case 'LT':
          alert.comp = aggregatorTTypes.AggrAlertComparator.ALERT_LT;
          break;
        case 'LTE':
          alert.comp = aggregatorTTypes.AggrAlertComparator.ALERT_LTE;
          break;
      }
      switch (row.level.item) {
        case 'Info':
          alert.level = aggregatorTTypes.AggrAlertLevel.ALERT_INFO;
          break;
        case 'Warning':
          alert.level = aggregatorTTypes.AggrAlertLevel.ALERT_WARNING;
          break;
        case 'Critical':
          alert.level = aggregatorTTypes.AggrAlertLevel.ALERT_CRITICAL;
          break;
      }
      aggrAlertConfList.alerts.push(alert);
    });
    aggrAlertConfList.write(tProtocol);
    transport1.flush();
  }
};

module.exports = self;
