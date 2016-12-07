const Influx = require('influx');
const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'cxl',
  schema: [
    {
      measurement: 'value',
      fields: {
        name: Influx.FieldType.STRING,
        node: Influx.FieldType.STRING,
      },
      tags: [
        'name',
        'node',
      ]
    }
  ],
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

  formatStats: function(result, tagName) {
    let columnNames = ["time"];
    let dataPoints = [];
    if ("results" in result) {
      let numResults = result.results.length;
      result.results.forEach(seriesList => {
        if ("series" in seriesList && seriesList.series.length) {
          let series = seriesList.series;
          // re-align sum'd data
          for (let valueIt = 1; valueIt < series[0].values.length - 1;
               valueIt++) {
            let pointsRow = [];
            let skipRow = false;
            for (let seriesIt = 0; seriesIt < series.length; seriesIt++) {
              // names
              if (valueIt == 1) {
                columnNames.push(
                  self.columnName(series[seriesIt].tags[tagName]));
              }
              // time stamps
              if (seriesIt == 0) {
                pointsRow.push(
                  new Date(series[seriesIt].values[valueIt][0])
                    .getTime());
              }
              pointsRow.push(series[seriesIt].values[valueIt][1]);
              skipRow = series[seriesIt].values[valueIt][1] == null ? true : skipRow;
            }
            if (!skipRow) {
              dataPoints.push(pointsRow);
            }
          }
        }
      });
    }
    const endpointResults = {
      name: "Traffic",
      columns: columnNames,
      points: dataPoints
    };
    return endpointResults;
  },

  query: function (req, res, next) {
    let metricType = req.params[0];
    let nodeNames = req.params[1].split(",").join("' OR \"node\" = '");
    let timeAgo = '1h';
    let queries = [];
    switch (metricType) {
      case 'traffic_sum':
        // show an aggregate of traffic (TX + RX) for the whole network
        // next parameter should be a list of nodes
        queries.push(
          "SELECT SUM(\"value\") AS \"value\" FROM \"tg_stats\" " +
          "WHERE (\"mac\" = '" + nodeNames + "') " +
          "AND (\"key\" = 'terra0.rx_bytes' " + 
            "OR \"key\" = 'terra0.tx_bytes') " +
          "AND \"time\" > (NOW() - " + timeAgo + ") " +
          "GROUP BY \"key\", TIME(30s)");
        break;
      case 'nodes_traffic_tx':
        // show traffic per host
        queries.push(
          "SELECT SUM(\"value\") AS \"value\" FROM \"tg_stats\" " +
          "WHERE (\"mac\" = '" + nodeNames + "') " +
          "AND \"key\" = 'terra0.tx_bytes' " + 
          "AND \"time\" > (NOW() - " + timeAgo + ") " +
          "GROUP BY \"mac\", TIME(30s)");
        break;
      case 'nodes_traffic_rx':
        // show traffic per host
        queries.push(
          "SELECT SUM(\"value\") AS \"value\" FROM \"tg_stats\" " +
          "WHERE (\"mac\" = '" + nodeNames + "') " +
          "AND \"key\" = 'terra0.rx_bytes' " + 
          "AND \"time\" > (NOW() - " + timeAgo + ") " +
          "GROUP BY \"mac\", TIME(30s)");
        break;
      case 'nodes_reporting':
        // this is not yet supported by influxdb, so we need a way of storing
        // hosts online
/*        queries.push(
          "SELECT COUNT(\"node\") AS \"count\" FROM \"tg_stats\" " +
          "WHERE (\"node\" = '" + nodeNames + "') " +
          "AND \"name\" = 'terra0.rx_bytes' " + 
          "AND \"time\" > (NOW() - 1m) " +
          "GROUP BY \"node\", TIME(30s)");*/
        break;
      case 'snr_by_node':
        break;
      default:
        console.error('Undefined metric:', metricType);
    }
    influx.queryRaw(queries).then(result => {
      // output post-processing
      switch (metricType) {
        case 'traffic_sum':
          res.json(self.formatStats(result, 'key'));
          break;
        case 'nodes_traffic_tx':
        case 'nodes_traffic_rx':
          res.json(self.formatStats(result, 'mac'));
          break;
        default:
          // push raw json
          res.json(result);
      }
    }).catch(err => {
      console.log(err);
      res.status(500).send(err.stack);
    });
  }
}

module.exports = self;
