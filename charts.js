const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit:    50,
    dateStrings:        true,
    host:               '127.0.0.1',
    user:               'root',
    password:           '',
    database:           'cxl',
    queueLimit:         10,
    waitForConnections: false,
    multipleStatements: true,
});

SUM_BY_KEY = "SELECT `key`, (FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) " +
             "AS time, SUM(value) AS value FROM time_series " +
             "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
             "WHERE `mac` IN ? " +
             "AND `key` IN ? " +
             "AND `time` > DATE_SUB(NOW(), INTERVAL 60 MINUTE) " +
             "GROUP BY `key`, UNIX_TIMESTAMP(time) DIV 30";
SUM_BY_MAC = "SELECT `mac`, " +
              "(FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) AS time, " +
              "SUM(value) AS value FROM time_series " +
              "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
              "WHERE `mac` IN ? " +
              "AND `key` IN ? " +
              "AND `time` > DATE_SUB(NOW(), INTERVAL 60 MINUTE) " +
              "GROUP BY `mac`, UNIX_TIMESTAMP(time) DIV 30";
LINK_METRIC = "SELECT `key`, (FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) " +
             "AS time, SUM(value) AS value FROM time_series " +
             "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
             "WHERE `mac` IN ? " +
             "AND `key` IN ? " +
             "AND `time` > DATE_SUB(NOW(), INTERVAL 60 MINUTE) " +
             "GROUP BY `key`, UNIX_TIMESTAMP(time) DIV 30";
var self = {
  columnName: function (metricName) {
    switch (metricName) {
      case 'terra0.tx_bytes':
        return 'TX Bytes';
      case 'terra0.rx_bytes':
        return 'RX Bytes';
      case 'terra0.tx_errors':
        return 'TX Errors';
      case 'terra0.rx_errors':
        return 'RX Errors';
      case 'terra0.tx_dropped':
        return 'TX Dropped';
      case 'terra0.rx_dropped':
        return 'RX Dropped';
      case 'load-1':
        return '1-Minute Load Avg';
      case 'mem.util':
        return 'Memory Utilization';
      default:
        return metricName;
    }
  },

  /*
   * Transform a result set into a list of points for pondjs
   * https://www.npmjs.com/package/react-timeseries-charts
   * const data = {
   *     name: "traffic",
   *     columns: ["time", "in", "out"],
   *     points: [
   *        [1400425947000, 52, 41],
   *        [1400425948000, 18, 45],
   *        [1400425949000, 26, 49],
   *        [1400425950000, 93, 81],
   *        ...
   *     ]
   * };
   */
  formatStats: function(result) {
    let dataPoints = [];
    result.forEach(row => {
      dataPoints.push([row.time * 1000, row.value]);
    });
    // drop the first and last data point since they're incomplete
    dataPoints.splice(0, 1);
    dataPoints.splice(-1, 1);
    const endpointResults = {
      name: "Traffic",
      columns: ["time", "value"],
      points: dataPoints,
    };
    return endpointResults;
  },

  formatStatsGroup: function(result, groupBy) {
    let columnNames = new Set();
    let dataPoints = [];
    // line up time => multiple points
    let timeSeriesGroup = {};
    result.forEach(row => {
      let keyName = row[groupBy];
      if (!(row.time in timeSeriesGroup)) {
        timeSeriesGroup[row.time] = {};
      }
      timeSeriesGroup[row.time][keyName] = row.value;
      // collect all unique key names
      columnNames.add(keyName);
    });
    let columnNamesArr = Array.from(columnNames);
    for (var key in timeSeriesGroup) {
      let values = timeSeriesGroup[key];
      let row = [key * 1000];
      for (var columnName in columnNamesArr) {
        row.push(values[columnNamesArr[columnName]] || 0);
      }
      dataPoints.push(row);
    }
    let columnDisplayNames = columnNamesArr.map(name => {
      return self.columnName(name);
    });
    // drop the first and last data point since they're incomplete
    dataPoints.splice(0, 1);
    dataPoints.splice(-1, 1);
    const endpointResults = {
      name: "Traffic",
      columns: ["time"].concat(columnDisplayNames),
      points: dataPoints,
    };
    return endpointResults;
  },

  queryObj: function(res, postDataJSON) {
    let postData = JSON.parse(postDataJSON);
    if ('chart_data' in postData && 'metric' in postData) {
      // construct query for node src <-> dst
      let nodeMacs = Object.keys(postData.chart_data.nodes);
      self.fetch(res, nodeMacs, postData.metric);
    } else {
      console.error("No chart data and/or metric specified in POST", postData);
    }
  },

  queryMulti: function(res, postDataJSON) {
    let postData = JSON.parse(postDataJSON);
    self.fetchMulti(res, postData);
  },

  makeLinkQuery: function(aNode, zNode, metricNames) {
    let query;
    let fields = [];
    // map metric short names to the fully qualified key
    let keyNames = metricNames.map(metricName => {
      switch (metricName) {
        case 'rssi':
          // tgf.38:3a:21:b0:0b:11.phystatus.srssi
          return 'tgf.' + zNode.mac + '.phystatus.srssi';
        case 'snr':
          // tgf.38:3a:21:b0:08:49.phystatus.spostSNRdB
          return 'tgf.' + zNode.mac + '.phystatus.spostSNRdB';
        default:
          console.error('Undefined metric:', metricName);
          return metricName;
      }
    });
    query = SUM_BY_MAC;
    fields = [
      [[aNode.mac]],
      [keyNames],
    ];
    if (!query) {
      console.log('Query undefined for metric:', metricName);
      return;
    }
    return mysql.format(query, fields);
  },

  makeNodeQuery: function(nodeMacs, metricName) {
    let query;
    let fields = [];
    switch (metricName) {
      case 'traffic_sum':
        // show an aggregate of traffic (TX + RX) for the whole network
        // next parameter should be a list of nodes
        query = SUM_BY_KEY;
        fields = [
          [nodeMacs],
          [['terra0.tx_bytes', 'terra0.rx_bytes']]
        ];
        break;
      case 'nodes_traffic_tx':
        // show traffic per host
        query = SUM_BY_MAC;
        fields = [
          [nodeMacs],
          [['terra0.tx_bytes']],
        ];
        break;
      case 'nodes_traffic_rx':
        query = SUM_BY_MAC;
        fields = [
          [nodeMacs],
          [['terra0.rx_bytes']],
        ];
        break;
      case 'errors_sum':
        query = SUM_BY_KEY;
        fields = [
          [nodeMacs],
          [['terra0.tx_errors', 'terra0.rx_errors']],
        ];
        break;
      case 'drops_sum':
        query = SUM_BY_KEY;
        fields = [
          [nodeMacs],
          [['terra0.tx_dropped', 'terra0.rx_dropped']],
        ];
        break;
      case 'mem_util':
        query = SUM_BY_MAC;
        fields = [
          [nodeMacs],
          [['mem.util']],
        ];
        break;
      case 'load-1':
      case 'load':
        query = SUM_BY_MAC;
        fields = [
          [nodeMacs],
          [['load-1']],
        ];
        break;
      case 'nodes_reporting':
        query = "SELECT (FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) AS time, " +
                "COUNT(DISTINCT node_id) AS value FROM time_series " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
                "WHERE `mac` IN ? " +
                "AND `key` = ? " +
                "AND `time` > DATE_SUB(NOW(), INTERVAL 60 MINUTE) " +
                "GROUP BY UNIX_TIMESTAMP(time) DIV 30 " +
                "ORDER BY time ASC";
        fields = [[nodeMacs], ['terra0.tx_bytes']];
        break;
      default:
        console.error('Undefined metric:', metricName);
    }
    if (!query) {
      console.log('Query undefined');
      return;
    }
    return mysql.format(query, fields);
  },

  fetch: function(res, nodeMacs, metricName) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }
      let query = self.makeNodeQuery(nodeMacs, metricName);
      let sqlQuery = conn.query(query, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        res.json(self.processResults(results, {}, metricName));
      });
    });
  },

  fetchMulti: function(res, queries) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }
      // generate sql queries
      let sqlQueries = queries.map(query => {
        switch (query.type) {
          case 'node':
            let nodeMacs = query.nodes.map(node => {
              return node.mac_addr;
            });
            return self.makeNodeQuery(nodeMacs, query.key);
            break;
          case 'link':
            return self.makeLinkQuery(query.a_node, query.z_node, query.keys);
            break;
          default:
            console.error('Unknown query type:', query.type);
        }
      });
      let sqlQuery = conn.query(sqlQueries.join("; "), function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        let retResults = [];
        if (sqlQueries.length > 1) {
          for (let i = 0; i < results.length; i++) {
            // TODO - need to fix this static metric setting, doesn't make sense for links
            retResults.push(self.processResults(results[i], queries[i], 'load'));
          }
        } else {
          retResults.push(self.processResults(results, queries, 'load'));
        }
        res.json(retResults);
      });
    });
  },

  processResults: function(result, query, metricName) {
    switch (metricName) {
      case 'traffic_sum':
      case 'errors_sum':
      case 'drops_sum':
        return self.formatStatsGroup(result, 'key', query);
        break;
      case 'nodes_traffic_tx':
      case 'nodes_traffic_rx':
      case 'mem_util':
      case 'load':
        return self.formatStatsGroup(result, 'mac', query);
        break;
      case 'nodes_reporting':
        return self.formatStats(result);
        break;
      default:
        // push raw json
        return result;
    }
  },
}

module.exports = self;
