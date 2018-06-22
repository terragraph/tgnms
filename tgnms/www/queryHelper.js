const fs = require('fs');
const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 50,
  dateStrings: true,
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || '',
  database: 'cxl',
  queueLimit: 10,
  waitForConnections: false,
  multipleStatements: true,
});
const topologyTTypes = require('./thrift/gen-nodejs/Topology_types');

const METRIC_KEY_NAMES = [
  'snr',
  'rssi',
  'mcs',
  'per',
  'fw_uptime',
  'tx_power',
  'rx_bytes',
  'tx_bytes',
  'rx_pps',
  'tx_pps',
  'rx_errors',
  'tx_errors',
  'rx_dropped',
  'tx_dropped',
  'rx_frame',
  'rx_overruns',
  'tx_overruns',
  'tx_collisions',
  'speed',
  'tx_ok',
  'tx_fail',
  /* 'link_status' (published from controller node * @format
 */
];

// TODO - restrict this correctly
const METRIC_NAMES =
  'SELECT `ts_key`.`id`, `mac`, `key` FROM `ts_key` ' +
  'JOIN (`nodes`) ON (`nodes`.`id`=`ts_key`.`node_id`) ' +
  'WHERE `mac` IN ? ' +
  'LIMIT 100000';

const EVENTLOG_BY_MAC_PART1 = 'SELECT `sample` FROM `events` PARTITION ';
const EVENTLOG_BY_MAC_PART2 =
  'JOIN (`event_categories`) ON (`event_categories`.`id`=`events`.`category_id`) ' +
  'JOIN (`nodes`) ON (`nodes`.`id`=`event_categories`.`node_id`) ' +
  'WHERE `mac` IN ? ' +
  'AND `category` = ? ' +
  'ORDER BY `events`.`id` DESC ' +
  'LIMIT ?, ?;';

const ALERTS_BY_MAC =
  'SELECT *, `alerts`.`id` AS row_id FROM `alerts` ' +
  'JOIN (`nodes`) ON (`nodes`.`id`=`alerts`.`node_id`) ' +
  'WHERE `mac` IN ? ' +
  'ORDER BY `alerts`.`id` DESC ' +
  'LIMIT ?, ?;';

const DELETE_ALERTS_BY_ID = 'DELETE FROM `alerts` ' + 'WHERE `id` IN ? ;';

const DELETE_ALERTS_BY_MAC =
  'DELETE `alerts` FROM `alerts` ' +
  'JOIN (`nodes`) ON (`nodes`.`id`=`alerts`.`node_id`) ' +
  'WHERE `mac` IN ? ;';

const DATA_FOLDER_PATH = '/home/nms/data/';

var self = {
  fetchSysLogs: function (res, macAddr, sourceFile, offset, size, date) {
    const folder = DATA_FOLDER_PATH + macAddr + '/';
    const fileName = folder + date + '_' + sourceFile + '.log';

    fs.readFile(fileName, 'utf-8', function (err, data) {
      if (err) {
        res.json([]);
        return;
      }

      var lines = data.trim().split('\n');

      const numLines = lines.length;
      let begin = numLines - size - offset;
      if (begin < 0) {begin = 0;}

      let end = begin + size;
      if (end > numLines) {end = numLines;}

      var respLines = lines.slice(begin, end);
      res.json(respLines);
    });
  },

  fetchEventLogs: function (res, macAddr, category, from, size, partition) {
    // execute query
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }

      const fields = [[macAddr], category, from, size];
      const queryString =
        EVENTLOG_BY_MAC_PART1 + '(' + partition + ') ' + EVENTLOG_BY_MAC_PART2;
      const sqlQuery = mysql.format(queryString, fields);
      conn.query(sqlQuery, function (err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        const dataPoints = [];
        results.forEach(row => {
          dataPoints.push(row.sample);
        });
        res.json(dataPoints);
      });
    });
  },
};

module.exports = self;
