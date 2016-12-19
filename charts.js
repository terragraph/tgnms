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
});

var self = {
  columnName: function (metricName) {
    switch (metricName) {
      case 'terra0.tx_bytes':
        return "TX Bytes";
      case 'terra0.rx_bytes':
        return "RX Bytes";
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
      self.fetch(res, postData.chart_data, postData.metric);
    } else {
      console.error("No chart data and/or metric specified in POST", postData);
    }
  },

  fetch: function(res, chartData, metricName) {
    let query;
    let fields = [];
    let nodeMacs = Object.keys(chartData.nodes);
    switch (metricName) {
      case 'traffic_sum':
        // show an aggregate of traffic (TX + RX) for the whole network
        // next parameter should be a list of nodes
        query =
          "SELECT `key`, (FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) " +
            "AS time, SUM(value) AS value FROM time_series " +
          "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
          "WHERE `mac` IN ? " +
          "AND `key` IN ? " +
          "AND `time` > DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
          "GROUP BY `key`, UNIX_TIMESTAMP(time) DIV 30";
        fields = [
          [nodeMacs],
          [['terra0.tx_bytes', 'terra0.rx_bytes']]
        ];
        break;
      case 'nodes_traffic_tx':
        // show traffic per host
        query = "SELECT `mac`, " +
                "(FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) AS time, " +
                "SUM(value) AS value FROM time_series " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
                "WHERE `mac` IN ? " +
                "AND `key` = ? " +
                "AND `time` > DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
                "GROUP BY `mac`, UNIX_TIMESTAMP(time) DIV 30"
        fields = [
          [nodeMacs],
          ['terra0.tx_bytes'],
        ];
        break;
      case 'nodes_traffic_rx':
        query = "SELECT `mac`, " +
                "(FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) AS time, " +
                "SUM(value) AS value FROM time_series " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
                "WHERE `mac` IN ? " +
                "AND `key` = ? " +
                "AND `time` > DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
                "GROUP BY `mac`, UNIX_TIMESTAMP(time) DIV 30"
        fields = [
          [nodeMacs],
          ['terra0.rx_bytes'],
        ];
        break;
      case 'nodes_reporting':
        query = "SELECT (FLOOR(UNIX_TIMESTAMP(time) / 30) * 30) AS time, " +
                "COUNT(DISTINCT node_id) AS value FROM time_series " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`time_series`.`node_id`) " +
                "WHERE `mac` IN ? " +
                "AND `key` = ? " +
                "AND `time` > DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
                "GROUP BY UNIX_TIMESTAMP(time) DIV 30 " +
                "ORDER BY time ASC";
        fields = [[nodeMacs], ['terra0.tx_bytes']];
        break;
      case 'snr_by_node':
        break;
      default:
        console.error('Undefined metric:', metricName);
    }
    if (!query) {
      console.log('Query undefined');
      res.status(500).end();
      return;
    }
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }
      let sqlQuery = conn.query(query, fields, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        self.processResults(res, metricName, results);
      });
    });
    // output post-processing
  },

  processResults: function(res, metricName, result) {
    switch (metricName) {
      case 'traffic_sum':
        res.json(self.formatStatsGroup(result, 'key'));
        break;
      case 'nodes_traffic_tx':
      case 'nodes_traffic_rx':
        res.json(self.formatStatsGroup(result, 'mac'));
        break;
      case 'nodes_reporting':
        res.json(self.formatStats(result));
        break;
      default:
        // push raw json
        res.json(result);
    }
  },
}

module.exports = self;
