// aggregate data points in buckets for easier grouping
const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 50,
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: 'cxl',
  queueLimit: 10,
  waitForConnections: false
});
pool.on('enqueue', function () {
  console.log('Waiting for available connection slot');
});
pool.on('error', function () {
  console.log('pool error');
});

// Convert thrift's Int64 (after conversion to plain json) to a number
// Precision might be lost if the int is >= 2^53
const toUint64 = thriftInt64 => {
  return Buffer.from(thriftInt64.buffer.data).readUIntBE(0, 8);
};

var self = {
  macAddrToNode: {},
  nodeNameToNode: {},

  refreshNodes: function () {
    pool.getConnection(function (err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT * FROM `nodes`', function (err, results) {
        if (err) {
          return;
        }
        results.forEach(row => {
          self.macAddrToNode[row.mac.toLowerCase()] = row;
          if (!(row.network in self.nodeNameToNode)) {
            self.nodeNameToNode[row.network] = {};
          }
          self.nodeNameToNode[row.network][row.node] = row;
        });
        conn.release();
      });
    });
  },

  writeScanResults: function (network, scanResults) {
    var rows = [];
    let refreshNodesList = false;

    Object.keys(scanResults.scans).forEach(token => {
      var scanData = scanResults.scans[token];
      if (!self.nodeNameToNode[network][scanData.txNode]) {
        console.error(
          'writeScanResults: txNode ' + scanData.txNode + ' not present in DB'
        );
        refreshNodesList = true;
        return;
      }
      var txNodeId = self.nodeNameToNode[network][scanData.txNode].id;
      var startBwgd = toUint64(scanData.startBwgdIdx);
      Object.keys(scanData.responses).forEach(rxNodeName => {
        if (!self.nodeNameToNode[network][rxNodeName]) {
          console.error(
            'writeScanResults: rxNode ' + rxNodeName + ' not present in DB'
          );
          refreshNodesList = true;
          return;
        }
        var rxNodeId = self.nodeNameToNode[network][rxNodeName].id;
        var scanResp = scanData.responses[rxNodeName];
        var superframeNum = toUint64(scanResp.curSuperframeNum);

        scanResp.routeInfoList.forEach(routeInfo => {
          var row = [
            token,
            txNodeId,
            startBwgd,
            rxNodeId,
            superframeNum,
            routeInfo.route.tx,
            routeInfo.route.rx,
            routeInfo.rssi,
            routeInfo.snrEst,
            routeInfo.postSnr,
            routeInfo.rxStart,
            routeInfo.packetIdx
          ];
          rows.push(row);
        });
      });
    });

    if (refreshNodesList) {
      self.refreshNodes();
    }
    if (!rows.length) {
      return;
    }

    pool.getConnection(function (err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query(
        'INSERT INTO scan_results' +
          '(`token`, `tx_node_id`, `start_bwgd`, `rx_node_id`, `superframe_num`, ' +
          '`tx_beam`, `rx_beam`, `rssi`, `snr_est`, `post_snr`, `rx_start`, `packet_idx`) VALUES ?',
        [rows],
        function (err, result) {
          if (err) {
            console.log('Some error', err);
          }
          console.log('wrote ' + rows.length + ' rows into scan_results');
          conn.release();
        }
      );
    });
  }
};

module.exports = self;
