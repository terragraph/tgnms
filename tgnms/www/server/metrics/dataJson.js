/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

// aggregate data points in buckets for easier grouping
const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 50,
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: 'cxl',
  queueLimit: 10,
  waitForConnections: false,
});
pool.on('enqueue', () => {
  console.log('Waiting for available connection slot');
});
pool.on('error', () => {
  console.log('pool error');
});

const self = {
  macAddrToNode: {},
  nodeNameToNode: {},
  scanResults: {},
  nodeToNodeName: {},
  selfTestColumnNames: [],
  selfTestGroups: {},

  refreshNodes() {
    pool.getConnection((err, conn) => {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT * FROM `nodes`', (err, results) => {
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

  refreshColumnNames(res, tableName, sendResult) {
    pool.getConnection((err, conn) => {
      if (err) {
        console.error('DB error', err);
        return;
      }
      const queryCmd =
        'SELECT column_name FROM information_schema.columns ' +
        'WHERE table_name = ?';
      const queryArgs = [tableName];
      conn.query(queryCmd, queryArgs, (err, results) => {
        if (err) {
          console.error('query error', err);
          return;
        }

        let columnObj = [];
        if (tableName === 'tx_scan_results') {
          columnObj = self.txColumnNames;
        } else if (tableName === 'rx_scan_results') {
          columnObj = self.rxColumnNames;
        } else if (tableName === 'terragraph_network_analyzer') {
          columnObj = self.selfTestColumnNames;
        } else {
          console.error('ERROR!! unexpected table name');
          return;
        }

        results.forEach(row => {
          columnObj.push(row.column_name);
        });

        if (sendResult) {
          res.send(columnObj).end(); // send column names
        }
        conn.release();
      });
    });
  },

  readSelfTestResults(network, res, filter) {
    const mysqlQueryRes = {};

    pool.getConnection((err, conn) => {
      if (err) {
        console.error('DB error', err);
        return;
      }

      // filterType is either TESTRESULTS or GROUPS
      if (!filter.hasOwnProperty('filterType')) {
        console.error('filterType missing from filter');
        return;
      }

      if (
        filter.filterType === 'TESTRESULTS' &&
        !filter.hasOwnProperty('testtime')
      ) {
        console.error('testtime missing from filter');
        return;
      }

      let queryCmd = '';
      const queryArgs = [];
      if (filter.filterType === 'GROUPS') {
        queryCmd =
          'SELECT time, test_tag FROM terragraph_network_analyzer GROUP BY time DESC, test_tag limit 50';
      } else if (filter.filterType === 'TESTRESULTS') {
        if (filter.testtime === 'mostrecentiperfudp') {
          const querySubCmd =
            'SELECT time FROM terragraph_network_analyzer WHERE test_tag=? ORDER BY time DESC limit 1';
          queryCmd =
            'SELECT * FROM terragraph_network_analyzer WHERE time=(' +
            querySubCmd +
            ')';
          queryArgs.push('iperf_udp');
        } else {
          queryCmd = 'SELECT * FROM terragraph_network_analyzer WHERE time=?';
          queryArgs.push(filter.testtime);
        }
      } else {
        console.error('invalid filterType ', filter.filterType);
        return;
      }

      const query = conn.query(queryCmd, queryArgs, (err, results) => {
        if (err) {
          console.error('ERROR: mysql query err:', query.sql, err);
          return;
        }
        // put the filter used into the results so we'll know what the
        // current fetch corresponds to
        mysqlQueryRes.results = results;
        mysqlQueryRes.filter = filter;
        if (res) {
          res.send(mysqlQueryRes).end();
        }
        if (filter.filterType === 'GROUPS') {
          self.selfTestGroups = results;
        }
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
  readScanResults(network, res, filter) {
    let refreshNodesList = false;
    const mysqlQueryRes = {};
    // the json_obj is a compressed blob of the scan results
    // for reasons not entirely understood, we need to CONVERT the UNCOMPRESSED
    // output
    const UNCOMPRESS = [
      mysql.raw(
        'CONVERT(UNCOMPRESS(rx_scan_results.json_obj) USING "utf8") AS json_obj',
      ),
    ];
    pool.getConnection((err, conn) => {
      if (err) {
        console.error('DB error', err);
        return;
      }

      const txNodeIdFilter = [];
      try {
        if (self.nodeNameToNode[network].hasOwnProperty(filter.nodeFilter[0])) {
          txNodeIdFilter[0] =
            self.nodeNameToNode[network][filter.nodeFilter[0]].id;
          txNodeIdFilter[1] = 'undefined';
          if (
            self.nodeNameToNode[network].hasOwnProperty(filter.nodeFilter[1])
          ) {
            txNodeIdFilter[1] =
              self.nodeNameToNode[network][filter.nodeFilter[1]].id;
          }
        }
      } catch (e) {
        console.error('ERROR reading filter', e);
        console.log(
          'self.nodeNameToNode:',
          self.nodeNameToNode,
          ' network:',
          network,
        );
        return;
      }

      let queryCmd =
        'SELECT tx_scan_results.token, tx_scan_results.tx_node_id, rx_scan_results.rx_node_id, ' +
        'tx_scan_results.start_bwgd, tx_scan_results.scan_type, tx_scan_results.network, ' +
        'tx_scan_results.timestamp, tx_scan_results.id, tx_scan_results.tx_power ,? FROM `tx_scan_results` JOIN `rx_scan_results` ' +
        'ON tx_scan_results.network=rx_scan_results.network AND tx_scan_results.start_bwgd=rx_scan_results.start_bwgd AND tx_scan_results.token=rx_scan_results.token' +
        ' WHERE tx_scan_results.network = ?';
      let queryArgs = [];
      if (txNodeIdFilter.length) {
        queryCmd +=
          ' AND (tx_scan_results.tx_node_id = ? OR tx_scan_results.tx_node_id= ?) LIMIT ? OFFSET ?';
        queryArgs = [
          UNCOMPRESS,
          network,
          txNodeIdFilter[0],
          txNodeIdFilter[1],
          filter.row_count,
          filter.offset,
        ];
      } else {
        queryCmd += ' LIMIT ? OFFSET ?';
        queryArgs = [UNCOMPRESS, network, filter.row_count, filter.offset];
      }
      const query = conn.query(queryCmd, queryArgs, (err, results) => {
        if (err) {
          console.error('ERROR: mysql query err:', query.sql, err);
          return;
        }
        // add the node name to the results
        let i = 0;
        const newResults = [];
        results.forEach(row => {
          const json_obj = JSON.parse(row.json_obj);
          delete row.json_obj;
          const new_row = JSON.parse(JSON.stringify(row));
          new_row.json_obj = json_obj;

          if (
            !self.nodeToNodeName[new_row.tx_node_id] ||
            !self.nodeToNodeName[new_row.rx_node_id]
          ) {
            refreshNodesList = true;
          } else {
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

  writeScanResults(network, scanResults) {
    const rows = [];
    let refreshNodesList = false;

    Object.keys(scanResults.scans).forEach(token => {
      const scanData = scanResults.scans[token];
      try {
        if (!self.nodeNameToNode[network][scanData.txNode]) {
          console.error(
            'writeScanResults: txNode ' +
              scanData.txNode +
              ' not present in DB',
          );
          refreshNodesList = true;
          return;
        }
      } catch (e) {
        console.error(
          'writeScanResults: txNode ' + scanData.txNode + ' not present in DB',
        );
      }
      const txNodeId = self.nodeNameToNode[network][scanData.txNode].id;
      const startBwgd = scanData.startBwgdIdx;
      let txPower = 255;
      try {
        txPower = scanData.responses[scanData.txNode].txPwrIndex;
      } catch (e) {
        console.error('ERROR: could not read txPwrIndex', e);
      }
      Object.keys(scanData.responses).forEach(scanRespNodeName => {
        try {
          if (!self.nodeNameToNode[network][scanRespNodeName]) {
            console.error(
              'writeScanResults: rxNode ' +
                scanRespNodeName +
                ' not present in DB',
            );
            refreshNodesList = true;
            return;
          }
        } catch (e) {
          console.error(
            'writeScanResults: rxNode ' +
              scanRespNodeName +
              ' not present in DB',
          );
        }
        // the tx node returns an empty routeInfoList and has the txPowerIndex
        // the tx node does not contain the measured scan results
        if (scanRespNodeName !== scanData.txNode) {
          const rxNodeId = self.nodeNameToNode[network][scanRespNodeName].id;
          const scanResp = scanData.responses[scanRespNodeName];

          // TODO the curSuperframeNum in the scanResp is an int64 which does
          //     not stringify need to deal with this
          const scanRespStr = JSON.stringify(scanResp);
          // write the scan response data in compressed format
          const scanRespStrCmprs = mysql.raw("COMPRESS('" + scanRespStr + "')");
          const scanType = 255; // TODO needs firmware support to add scan type
          const row = [
            token,
            scanRespStrCmprs,
            txNodeId,
            rxNodeId,
            startBwgd,
            scanType, // PBF, RTCAL, CBF, IM, initial BF
            txPower, // used during the scan
            network, // name of the topology
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

    pool.getConnection((err, conn) => {
      if (err) {
        console.error('DB error', err);
        return;
      }
      const query = conn.query(
        'INSERT INTO scan_results' +
          '(`token`, `json_obj`, `tx_node_id`, `rx_node_id`, `start_bwgd`, ' +
          '`scan_type`, `tx_power`,`network`) VALUES ?',
        [rows],
        (err, result) => {
          if (err) {
            console.error('ERROR with mysql query', query.sql, err);
          }
          conn.release();
        },
      );
    });
  },
};

// load the initial node ids
self.refreshNodes();

module.exports = self;
