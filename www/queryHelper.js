const fs = require('fs');
const mysql = require('mysql');
const _ = require('lodash');
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
  /* 'link_status' (published from controller node */
];

METRIC_NAMES = "SELECT `ts_key`.`id`, `mac`, `key` FROM `ts_key` " +
               "JOIN (`nodes`) ON (`nodes`.`id`=`ts_key`.`node_id`) " +
               "WHERE `mac` IN ?";

SYSLOG_BY_MAC = "SELECT `log` FROM `sys_logs` " +
                "JOIN (`log_sources`) ON (`log_sources`.`id`=`sys_logs`.`source_id`) " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`log_sources`.`node_id`) " +
                "WHERE `mac` = ? " +
                "AND `filename` = ? " +
                "ORDER BY `sys_logs`.`id` DESC " +
                "LIMIT ?, ?;";

EVENTLOG_BY_MAC_PART1 = "SELECT `sample` FROM `events` PARTITION ";
EVENTLOG_BY_MAC_PART2 = "JOIN (`event_categories`) ON (`event_categories`.`id`=`events`.`category_id`) " +
                  "JOIN (`nodes`) ON (`nodes`.`id`=`event_categories`.`node_id`) " +
                  "WHERE `mac` IN ? " +
                  "AND `category` = ? " +
                  "ORDER BY `events`.`id` DESC " +
                  "LIMIT ?, ?;";

ALERTS_BY_MAC = "SELECT *, `alerts`.`id` AS row_id FROM `alerts` " +
                "JOIN (`nodes`) ON (`nodes`.`id`=`alerts`.`node_id`) " +
                "WHERE `mac` IN ? " +
                "ORDER BY `alerts`.`id` DESC " +
                "LIMIT ?, ?;";

DELETE_ALERTS_BY_ID = "DELETE FROM `alerts` " +
                      "WHERE `id` IN ? ;";

DELETE_ALERTS_BY_MAC = "DELETE `alerts` FROM `alerts` " +
                       "JOIN (`nodes`) ON (`nodes`.`id`=`alerts`.`node_id`) " +
                       "WHERE `mac` IN ? ;";

const DATA_FOLDER_PATH = '/home/nms/data/';

MAX_COLUMNS = 7;
var self = {
  keyIds: {},
  nodeKeyIds: {},

  refreshKeyNames: function() {
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        return;
      }
      let sqlQuery = "SELECT ts_key.id, nodes.mac, ts_key.key FROM ts_key " +
                     "JOIN (nodes) ON (nodes.id=ts_key.node_id)";
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        results.forEach(result => {
          self.keyIds[result.id] = {
            mac: result.mac,
            name: result.key
          };
          if (!(result.mac in self.nodeKeyIds)) {
            self.nodeKeyIds[result.mac] = {};
          }
          self.nodeKeyIds[result.mac][result.key.toLowerCase()] = result.id;
        });

      });
    });
  },

  // fetch metric names from DB
  fetchMetricNames: function(res, jsonPostData) {
    let postData = JSON.parse(jsonPostData);
    if (!postData ||
        !postData.topology ||
        !postData.topology.nodes ||
        !postData.topology.nodes.length) {
      return;
    }
    let nodeMacs = postData.topology.nodes.map(node => {
      return node.mac_addr;
    });
    // map name => node
    let nodesByName = {};
    postData.topology.nodes.forEach(node => {
      nodesByName[node.name] = node;
    });
    // fetch all keys for nodes in topology
    let sqlQuery = mysql.format(METRIC_NAMES, [[nodeMacs]]);
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        let nodeMetrics = {};
        let siteMetrics = {};
        results.forEach(result => {
          // filter results
          if (result.key.endsWith("count.0") ||
              result.key.endsWith("count.600") ||
              result.key.endsWith("count.3600")) {
            return;
          }
          let mac = result.mac.toLowerCase();
          // map node => keys
          if (!(mac in nodeMetrics)) {
            nodeMetrics[mac] = {};
          }
          nodeMetrics[mac][result.key.toLowerCase()] = {
            dbKeyId: result.id
          };
        });
        // index by siteData['Site-A']['nodeName'] = [];
        postData.topology.nodes.forEach(node => {
          let mac = node.mac_addr.toLowerCase();
          if (mac in nodeMetrics) {
            let nodeData = nodeMetrics[mac];
            if (!(node.site_name in siteMetrics)) {
              siteMetrics[node.site_name] = {};
            }
            if (!(node.name in siteMetrics[node.site_name])) {
              siteMetrics[node.site_name][node.name] = [];
            }
            siteMetrics[node.site_name][node.name] = nodeData;
          }
        });
        // format all node + link stats
        // return list of key => name
        postData.topology.links.forEach(link => {
          // format the metric names
          let aNode = nodesByName[link.a_node_name];
          let zNode = nodesByName[link.z_node_name];
          METRIC_KEY_NAMES.forEach(metricName => {
            try {
              let {title, description, scale, keys} =
                self.formatLinkKeyName(
                  metricName,
                  {name: aNode.name, mac: aNode.mac_addr},
                  {name: zNode.name, mac: zNode.mac_addr});
              keys.forEach(data => {
                let {node, keyName, titleAppend} = data;
                // find and tag the associated keys
                if (node.mac in nodeMetrics &&
                    keyName.toLowerCase() in nodeMetrics[node.mac]) {
                  let nodeData = nodeMetrics[node.mac][keyName.toLowerCase()];
                  // display name in the typeahead
                  nodeData['displayName'] = title;
                  nodeData['linkName'] = link.name;
                  nodeData['linkTitleAppend'] = titleAppend ? titleAppend : '';
                  // title when graphing
                  nodeData['title'] = titleAppend ? title + titleAppend : title;
                  nodeData['description'] = description;
                  nodeData['scale'] = scale;
                }
              });
            } catch (e) {
              console.error(e);
            }
          });
        });
        res.json({
          'site_metrics': siteMetrics,
        });
      });
    });
  },

  timePeriod: function(secondDiff) {
    if (secondDiff > (60 * 60)) {
      return self.round(secondDiff/60/60) + ' hours';
    } else if (secondDiff > 60) {
      return self.round(secondDiff/60) + ' minutes';
    } else {
      return secondDiff + ' seconds';
    }
  },

  round: function(value) {
    return Math.ceil(value * 100) / 100;
  },

  formatLinkKeyName: function(metricName, aNode, zNode) {
    switch (metricName) {
      case 'rssi':
        return self.createLinkMetric(aNode, zNode,
                                     'RSSI', 'Received Signal Strength Indicator',
                                     'phystatus.srssi');
      case 'alive_perc':
      case 'alive_snr':
      case 'snr':
        // tgf.00:00:00:10:0d:45.phystatus.ssnrEst
        return self.createLinkMetric(aNode, zNode,
                                     'SnR', 'Signal to Noise Ratio',
                                     'phystatus.ssnrEst');
        break;
      case 'mcs':
        // tgf.38:3a:21:b0:05:d1.staPkt.mcs
        return self.createLinkMetric(aNode, zNode,
                                     'MCS', 'MCS Index',
                                     'staPkt.mcs');
      case 'per':
        // tgf.38:3a:21:b0:05:d1.staPkt.perE6
        return self.createLinkMetric(aNode, zNode,
                                     'PER', 'Packet Error Rate',
                                     'staPkt.perE6');
      case 'fw_uptime':
        // tgf.00:00:00:10:0d:45.phystatus.ssnrEst
        return self.createLinkMetric(aNode, zNode,
                                     'FW Uptime', 'Mgmt Tx Keepalive Count',
                                     'mgmtTx.keepAlive');
      case 'rx_ok':
        return self.createLinkMetric(aNode, zNode,
                                     'RX Packets', 'Received packets',
                                     'staPkt.rxOk');
      case 'tx_ok':
        return self.createLinkMetric(aNode, zNode,
                                     'TX Packets', 'Transferred packets',
                                     'staPkt.txOk');
      case 'tx_bytes':
        return self.createLinkMetric(aNode, zNode,
                                     'TX bps', 'Transferred bits/second',
                                     'tx_bytes', 'link');
      case 'rx_bytes':
        return self.createLinkMetric(aNode, zNode,
                                     'RX bps', 'Received bits/second',
                                     'rx_bytes', 'link');
      case 'tx_errors':
        return self.createLinkMetric(aNode, zNode,
                                     'TX errors', 'Transmit errors/second',
                                     'tx_errors', 'link');
      case 'rx_errors':
        return self.createLinkMetric(aNode, zNode,
                                     'RX errors', 'Receive errors/second',
                                     'rx_errors', 'link');
      case 'tx_dropped':
        return self.createLinkMetric(aNode, zNode,
                                     'TX dropped', 'Transmit dropped/second',
                                     'tx_dropped', 'link');
      case 'rx_dropped':
        return self.createLinkMetric(aNode, zNode,
                                     'RX dropped', 'Receive dropped/second',
                                     'rx_dropped', 'link');
      case 'tx_pps':
        return self.createLinkMetric(aNode, zNode,
                                     'TX pps', 'Transmit packets/second',
                                     'tx_packets', 'link');
      case 'rx_pps':
        return self.createLinkMetric(aNode, zNode,
                                     'RX pps', 'Receive packets/second',
                                     'rx_packets', 'link');
      case 'tx_power':
        // tgf.38:3a:21:b0:05:d1.tpcStats.txPowerIndex
        return self.createLinkMetric(aNode, zNode,
                                     'TX Power', 'Transmit Power',
                                     'tpcStats.txPowerIndex');
      case 'rx_frame':
        return self.createLinkMetric(aNode, zNode,
                                     'RX Frame', 'RX Frame',
                                     'rx_frame', 'link');
      case 'rx_overruns':
        return self.createLinkMetric(aNode, zNode,
                                     'RX Overruns', 'RX Overruns',
                                     'rx_overruns', 'link');
      case 'tx_overruns':
        return self.createLinkMetric(aNode, zNode,
                                     'TX Overruns', 'TX Overruns',
                                     'tx_overruns', 'link');
      case 'tx_collisions':
        return self.createLinkMetric(aNode, zNode,
                                     'TX Collisions', 'TX Collisions',
                                     'tx_collisions', 'link');
      case 'speed':
        return self.createLinkMetric(aNode, zNode,
                                     'Speed', 'Speed (mbps)',
                                     'speed', 'link');
      case 'link_status':
        return {
          title: 'Link status',
          description: 'Link status reported by controller',
          scale: undefined,
          keys: [
            {
              /* This is reported by controller MAC (TODO) */
              node: aNode,
              keyName: 'e2e_controller.link_status.WIRELESS.' +
                aNode.mac + '.' + zNode.mac,
              titleAppend: ' (A)'
            },
          ]
        };
      default:
        throw "Undefined metric: " + metricName;
    }
  },

  createLinkMetric: function(aNode,
                             zNode,
                             title,
                             description,
                             keyName,
                             keyPrefix = 'tgf') {
        return {
          title: title,
          description: description,
          scale: undefined,
          keys: [
            {
              node: aNode,
              keyName: keyPrefix + '.' + zNode.mac + '.' + keyName,
              titleAppend: ' (A)'
            },{
              node: zNode,
              keyName: keyPrefix + '.' + aNode.mac + '.' + keyName,
              titleAppend: ' (Z)'
            },
          ]
        };
  },


  fetchLinkKeyIds: function(metricName, aNode, zNode) {
    let keyIds = [];
    let linkKeys = self.formatLinkKeyName(metricName, aNode, zNode);
    linkKeys.keys.forEach(keyData => {
      if (aNode.mac in self.nodeKeyIds &&
          keyData.keyName.toLowerCase() in self.nodeKeyIds[aNode.mac]) {
        let keyId = self.nodeKeyIds[aNode.mac][keyData.keyName.toLowerCase()];
        keyIds.push(keyId);
      }
    });
    return keyIds;
  },

  makeTableQuery: function(res, topology, metricName, type, agg_type, duration) {
    // make a list of node -> health metric names -> key ids
    // nodes by name
    let nodesByName = {};
    let nodesByMac = {};
    topology.nodes.forEach(node => {
      nodesByName[node.name] = {
        name: node.name,
        mac: node.mac_addr
      };
      nodesByMac[node.mac_addr.toLowerCase()] = node.name;
    });
    // calculate query
    let nodeKeyIds = [];
    let nodeData = [];
    // [{mac, metric name, key name, key id}, ..]
    topology.links.forEach(link => {
      // ignore wired links
      if (link.link_type != 1) {
        return;
      }
      let aNode = nodesByName[link.a_node_name];
      let zNode = nodesByName[link.z_node_name];
      // add nodes to request list
      let linkKeys = self.formatLinkKeyName(metricName, aNode, zNode);
      linkKeys.keys.forEach(keyData => {
        if (aNode.mac in self.nodeKeyIds &&
            keyData.keyName.toLowerCase() in self.nodeKeyIds[aNode.mac]) {
          let keyId = self.nodeKeyIds[aNode.mac][keyData.keyName.toLowerCase()];
          nodeKeyIds.push(keyId);
          nodeData.push({
            keyId: keyId,
            key: keyData.keyName,
            linkName: link.name,
            linkTitleAppend: "(A)"
          });
        } else if (zNode.mac in self.nodeKeyIds &&
                   keyData.keyName.toLowerCase() in self.nodeKeyIds[zNode.mac]) {
          let keyId = self.nodeKeyIds[zNode.mac][keyData.keyName.toLowerCase()];
          nodeKeyIds.push(keyId);
          nodeData.push({
           keyId: keyId,
           key: keyData.keyName,
           linkName: link.name,
           linkTitleAppend: "(Z)"
          });
        }
      });
    });
    let now = parseInt(new Date().getTime() / 1000);
    let query = {
      type: type,
      key_ids: nodeKeyIds,
      data: nodeData,
      start_ts: now - (duration),
      end_ts: now,
      agg_type: agg_type
    };
    return [query];
  },

  fetchSysLogs: function(res, mac_addr, sourceFile, offset, size, date) {

    let folder = DATA_FOLDER_PATH + mac_addr + '/';
    let fileName = folder + date + '_' + sourceFile + ".log";

    fs.readFile(fileName, 'utf-8', function(err, data) {
        if (err) {
          res.json([]);
          return;
        }

        var lines = data.trim().split('\n');

        let numLines = lines.length;
        let begin = numLines - size - offset;
        if (begin < 0) begin = 0;

        let end = begin + size;
        if (end > numLines) end = numLines;

        var respLines = lines.slice(begin, end);
        res.json(respLines);
    });
  },

  fetchEventLogs: function(res, mac_addr, category, from, size, partition) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }

      let fields = [[mac_addr], category, from, size];
      let queryString = EVENTLOG_BY_MAC_PART1 + '(' + partition + ') ' + EVENTLOG_BY_MAC_PART2;
      let sqlQuery = mysql.format(queryString, fields);
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        let dataPoints = [];
        results.forEach(row => {
          dataPoints.push(row.sample);
        });
        res.json(dataPoints);
      });
    });
  },

  fetchAlerts: function(res, mac_addr, from, size) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }

      let fields = [[mac_addr], from, size];
      let sqlQuery = mysql.format(ALERTS_BY_MAC, fields);
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        let dataPoints = [];
        results.forEach(row => {
          dataPoints.push({
            id: row.row_id,
            mac: row.mac,
            timestamp: row.timestamp,
            alert_id: row.alert_id,
            alert_regex: row.alert_regex,
            alert_threshold: row.alert_threshold,
            alert_comparator: row.alert_comparator,
            alert_level: row.alert_level,
            trigger_key: row.trigger_key,
            trigger_value: row.trigger_value});
        });
        res.json(dataPoints);
      });
    });
  },

  deleteAlertsById: function(res, ids) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }

      let fields = [[ids]];
      let sqlQuery = mysql.format(DELETE_ALERTS_BY_ID, fields);
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
      });
    });
  },

  deleteAlertsByMac: function(res, mac_addr) {
    // execute query
    pool.getConnection(function(err, conn) {
      if (!conn) {
        console.error("Unable to get mysql connection");
        res.status(500).end();
        return;
      }

      let fields = [[mac_addr]];
      let sqlQuery = mysql.format(DELETE_ALERTS_BY_MAC, fields);
      conn.query(sqlQuery, function(err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
      });
    });
  },
}

module.exports = self;
