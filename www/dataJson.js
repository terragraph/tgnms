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
  scanResults : {},
  nodeToNodeName: {},

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

          // don't need network node, id is unique
          self.nodeToNodeName[row.id] = row.node;
        });
        conn.release();
      });
    });
  },

  // filter defines the mysql query
  //  row_count - the number of rows to fetch
  //  offset - fetch starting at the offset row number
  //  nodeFilter0/nodeFilter1 - to use against tx_node_id (use both)
  // network is the text name of the network topology
  // res is a pointer to the express class to return the result
  readScanResults: function (network, res, filter) {
    let refreshNodesList = false;
    let mysqlQueryRes = {};
    // the json_obj is a compressed blob of the scan results
    // for reasons not entirely understood, we need to CONVERT the UNCOMPRESSED
    // output
    let UNCOMPRESS = [mysql.raw('CONVERT(UNCOMPRESS(rx_scan_results.json_obj) USING "utf8") AS json_obj')];
    pool.getConnection(function (err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }

      let txNodeIdFilter = [];
      try {
        if (self.nodeNameToNode[network].hasOwnProperty(filter.nodeFilter[0])) {
          txNodeIdFilter[0] =
            self.nodeNameToNode[network][filter.nodeFilter[0]].id;
          txNodeIdFilter[1] = "undefined";
          if (self.nodeNameToNode[network].hasOwnProperty(filter.nodeFilter[1])) {
            txNodeIdFilter[1] =
              self.nodeNameToNode[network][filter.nodeFilter[1]].id;
          }
        }
      } catch(e) {
        console.error('ERROR reading filter', e)
        console.log("self.nodeNameToNode:", self.nodeNameToNode, " network:",network);
        return;
      }

      let queryCmd = "SELECT tx_scan_results.token, tx_scan_results.tx_node_id, rx_scan_results.rx_node_id, " +
                              "tx_scan_results.start_bwgd, tx_scan_results.scan_type, tx_scan_results.network, " +
                              "tx_scan_results.timestamp, tx_scan_results.id, tx_scan_results.tx_power ,? FROM `tx_scan_results` JOIN `rx_scan_results` " +
                              "ON tx_scan_results.network=rx_scan_results.network AND tx_scan_results.start_bwgd=rx_scan_results.start_bwgd AND tx_scan_results.token=rx_scan_results.token" +
                              " WHERE tx_scan_results.network = ?";
      let queryArgs = [];
      if (txNodeIdFilter.length) {
        queryCmd = queryCmd + ' AND (tx_scan_results.tx_node_id = ? OR tx_scan_results.tx_node_id= ?) LIMIT ? OFFSET ?';
        queryArgs = [UNCOMPRESS, network, txNodeIdFilter[0],
                    txNodeIdFilter[1], filter.row_count, filter.offset];
      }
      else {
        queryCmd = queryCmd + ' LIMIT ? OFFSET ?';
        queryArgs = [UNCOMPRESS, network, filter.row_count,
                      filter.offset];
      }
      let query = conn.query(queryCmd, queryArgs, function (err, results) {
          if (err) {
            console.error('ERROR: mysql query err:', query.sql, err);
            return;
          }
          // add the node name to the results
          let i = 0;
          let newResults = [];
          results.forEach(row => {
            let json_obj = JSON.parse(row.json_obj);
            delete row.json_obj;
            let new_row = JSON.parse(JSON.stringify(row));
            new_row.json_obj = json_obj;

            if (!self.nodeToNodeName[new_row.tx_node_id] ||
                !self.nodeToNodeName[new_row.rx_node_id]) {
                  refreshNodesList = true;
            }
            else {
              new_row.tx_node_name = self.nodeToNodeName[new_row.tx_node_id];
              new_row.rx_node_name = self.nodeToNodeName[new_row.rx_node_id];
            }
            newResults[i++] = new_row;
          });
          // put the filter used into the results so we'll know what the
          // current fetch corresponds to
          mysqlQueryRes.results = newResults;
          mysqlQueryRes.filter = filter;
          res.send(mysqlQueryRes).end();
          conn.release();
        });
      });
      if (refreshNodesList) {
        console.error('readScanResults: nodes not present in DB');
        self.refreshNodes();
      }
    },

  writeScanResults: function (network, scanResults) {
    let rows = [];
    let refreshNodesList = false;

    Object.keys(scanResults.scans).forEach(token => {
      let scanData = scanResults.scans[token];
      try {
        if (!self.nodeNameToNode[network][scanData.txNode]) {
          console.error(
            'writeScanResults: txNode ' + scanData.txNode + ' not present in DB'
          );
          refreshNodesList = true;
          return;
        }
      } catch (e) {
        console.error(
          'writeScanResults: txNode ' + scanData.txNode + ' not present in DB'
        );
      }
      let txNodeId = self.nodeNameToNode[network][scanData.txNode].id;
      let startBwgd = toUint64(scanData.startBwgdIdx);
      let txPower = 255;
      try {
        txPower = scanData.responses[scanData.txNode].txPwrIndex;
      } catch(e) {console.error('ERROR: could not read txPwrIndex', e)};
      Object.keys(scanData.responses).forEach(scanRespNodeName => {
        try {
          if (!self.nodeNameToNode[network][scanRespNodeName]) {
            console.error(
              'writeScanResults: rxNode ' + scanRespNodeName + ' not present in DB'
            );
            refreshNodesList = true;
            return;
          }
        } catch (e) {
          console.error(
            'writeScanResults: rxNode ' + scanRespNodeName + ' not present in DB'
          );
        }
        // the tx node returns an empty routeInfoList and has the txPowerIndex
        // the tx node does not contain the measured scan results
        if (scanRespNodeName !== scanData.txNode) {
          let rxNodeId = self.nodeNameToNode[network][scanRespNodeName].id;
          let scanResp = scanData.responses[scanRespNodeName];

          // TODO the curSuperframeNum in the scanResp is an int64 which does
          //     not stringify need to deal with this
          let scanRespStr = JSON.stringify(scanResp);
          // write the scan response data in compressed format
          let scanRespStrCmprs = mysql.raw("COMPRESS('" + scanRespStr + "')");
          let scanType = 255; // TODO needs firmware support to add scan type
          let row = [
            token,
            scanRespStrCmprs,
            txNodeId,
            rxNodeId,
            startBwgd,
            scanType, // PBF, RTCAL, CBF, IM, initial BF
            txPower, // used during the scan
            network  // name of the topology
          ];
          rows.push(row);
        }
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
      let query = conn.query(
        'INSERT INTO scan_results' +
          '(`token`, `json_obj`, `tx_node_id`, `rx_node_id`, `start_bwgd`, ' +
          '`scan_type`, `tx_power`,`network`) VALUES ?',
        [rows],
        function (err, result) {
          if (err) {
            console.error('ERROR with mysql query', query.sql, err);
          }
          conn.release();
        }
      );
    });
  }
};

module.exports = self;
