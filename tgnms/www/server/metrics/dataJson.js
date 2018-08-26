/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

// aggregate data points in buckets for easier grouping
const mysql = require('mysql');
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASS,
  MYSQL_DB,
} = require('../config');
const logger = require('../log')(module);

const pool = mysql.createPool({
  connectionLimit: 10,
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASS,
  database: MYSQL_DB,
  queueLimit: 4,
  waitForConnections: false,
});
pool.on('enqueue', () => {
  logger.debug('Waiting for available connection slot');
});
pool.on('error', () => {
  logger.error('pool error');
});

// fields not to include in response
const scanTableTxBlackList = ['id', 'scan_resp', 'tx_node_id'];
const scanTableRxBlackList = ['scan_resp', 'rx_node_id', 'timestamp'];

const self = {
  macAddrToNode: {},
  nodeNameToNode: {},
  scanResults: {},
  nodeToNodeName: {},
  txColumnNames: [],
  rxColumnNames: [],

  refreshNodes() {
    pool.query('SELECT * FROM `nodes`', (err, results) => {
      if (err) {
        logger.error('DB error: %s', err);
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
    });
  },

  refreshColumnNames(res, tableName, sendResult) {
    const queryCmd =
      'SELECT column_name FROM information_schema.columns ' +
      'WHERE table_name = ?';
    const queryArgs = [tableName];
    pool.query(queryCmd, queryArgs, (err, results) => {
      if (err) {
        logger.error('DB error: %s', err);
        return;
      }

      let columnObj = [];
      if (tableName === 'tx_scan_results') {
        columnObj = self.txColumnNames;
      } else if (tableName === 'rx_scan_results') {
        columnObj = self.rxColumnNames;
      } else {
        logger.error('ERROR!! unexpected table name');
        return;
      }

      results.forEach(row => {
        columnObj.push(row.column_name);
      });

      if (sendResult) {
        res.send(columnObj).end(); // send column names
      }
    });
  },

  // filter contains
  //  filter.whereClause used for the query
  //  filter.isConcise - boolean whether to include the json blob or not
  readScanResults(network, res, filter) {
    if (!filter.hasOwnProperty('isConcise')) {
      logger.error('isConcise missing from filter');
      return;
    }
    if (!filter.hasOwnProperty('whereClause')) {
      logger.error('whereClause missing from filter');
      return;
    }
    if (!filter.hasOwnProperty('rowCount')) {
      logger.error('rowCount missing from filter');
      return;
    }
    if (!filter.hasOwnProperty('offset')) {
      logger.error('offset missing from filter');
      return;
    }
    // query is "SELECT field1, field2, ... fieldn FROM tx_scan_results JOIN
    // rx_scan_results ON rx_scan_results.tx_id=tx_scan_results.id <whereClause>
    // LIMIT x OFFSET y"
    let queryCmd = 'SELECT ';
    let useSeparator = false;

    // scan_resp is a compressed blob of the scan results
    // include the json blob in the query if "isConcise" is false
    if (!filter.isConcise) {
      queryCmd +=
        'CONVERT(UNCOMPRESS(rx_scan_results.scan_resp) USING ' +
        '"utf8") AS scan_resp';
      queryCmd +=
        ', CONVERT(UNCOMPRESS(tx_scan_results.scan_resp) USING ' +
        '"utf8") AS "tx_scan_resp"';
      useSeparator = true;
    }

    self.rxColumnNames.forEach((field, idx, array) => {
      if (!scanTableRxBlackList.includes(field)) {
        if (useSeparator) {
          queryCmd += ', ';
        }
        queryCmd += 'rx_scan_results.' + field;
        // return "id" as rx_scan_results.id to avoid duplicate errors
        if (field === 'id') {
          queryCmd += " AS 'rx_scan_results.id'";
        }
        useSeparator = true;
      }
    });

    self.txColumnNames.forEach((field, idx, array) => {
      if (!scanTableTxBlackList.includes(field)) {
        if (useSeparator) {
          queryCmd += ', ';
        }
        queryCmd += 'tx_scan_results.' + field;
        useSeparator = true;
      }
    });

    queryCmd +=
      ' FROM tx_scan_results JOIN rx_scan_results ON' +
      ' rx_scan_results.tx_id=tx_scan_results.id WHERE ' +
      filter.whereClause;

    if (filter.whereClause.length > 0) {
      queryCmd += ' AND ';
    }

    queryCmd +=
      'network=? ORDER BY timestamp DESC,resp_id DESC LIMIT ? OFFSET ?';
    const queryArgs = [network, filter.rowCount, filter.offset];

    const query = pool.query(queryCmd, queryArgs, (err, results) => {
      if (err) {
        logger.error('DB error: (%s) %s', query.sql, err);
        return;
      }
      // parse the json blob if not isConcise
      const newResults = [];
      let scan_resp = {};
      results.forEach(row => {
        if (!filter.isConcise) {
          try {
            scan_resp = JSON.parse(row.scan_resp);
            row.scan_resp = scan_resp;
            scan_resp = JSON.parse(row.tx_scan_resp);
            row.tx_scan_resp = scan_resp;
          } catch (ex) {
            logger.error('ERROR: JSON parse scan response failed %s', ex);
          }
        }
        newResults.push(row);
      });
      // put the filter used into the results so we'll know what the
      // current fetch corresponds to
      const mysqlQueryRes = {};
      mysqlQueryRes.results = results;
      mysqlQueryRes.filter = filter;
      res.send(mysqlQueryRes).end();
    });
  },
};

// load the initial node ids
self.refreshNodes();
self.refreshColumnNames(null, 'tx_scan_results', false);
self.refreshColumnNames(null, 'rx_scan_results', false);

module.exports = self;
