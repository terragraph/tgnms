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
  multipleStatements: true
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
  'speed'
  /* 'link_status' (published from controller node */
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
  keyIds: {},
  nodeKeyIds: {},

  refreshKeyNames: function () {
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        return;
      }
      let sqlQuery =
        'SELECT ts_key.id, nodes.mac, ts_key.key FROM ts_key ' +
        'JOIN (nodes) ON (nodes.id=ts_key.node_id)';
      conn.query(sqlQuery, function (err, results) {
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
  fetchMetricNames: function (res, jsonPostData) {
    let postData = JSON.parse(jsonPostData);
    if (
      !postData ||
      !postData.topology ||
      !postData.topology.nodes ||
      !postData.topology.nodes.length
    ) {
      return;
    }
    let nodeMacs = postData.topology.nodes.map(node => {
      return node.mac_addr;
    });
    // map name => node
    let nodesByName = {};
    postData.topology.nodes.forEach(node => {
      // clean-up state data
      nodesByName[node.name] = node;
    });
    // fetch all keys for nodes in topology
    let sqlQuery = mysql.format(METRIC_NAMES, [[nodeMacs]]);
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }
      conn.query(sqlQuery, function (err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
          return;
        }
        let nodeMetrics = {};
        let siteMetrics = {};
        results.forEach(result => {
          // filter results
          if (
            result.key.endsWith('count.0') ||
            result.key.endsWith('count.600') ||
            result.key.endsWith('count.3600')
          ) {
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
          if (
            !node ||
            !node.hasOwnProperty('mac_addr') ||
            !node.mac_addr.length
          ) {
            return;
          }
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
              let { title, description, scale, keys } = self.formatLinkKeyName(
                metricName,
                aNode,
                zNode
              );
              keys.forEach(data => {
                let { node, keyName, titleAppend } = data;
                // find and tag the associated keys
                if (
                  node.mac in nodeMetrics &&
                  keyName.toLowerCase() in nodeMetrics[node.mac]
                ) {
                  let nodeData = nodeMetrics[node.mac][keyName.toLowerCase()];
                  // display name in the typeahead
                  nodeData['displayName'] = title;
                  nodeData['linkName'] = link.name;
                  nodeData['linkTitleAppend'] = titleAppend || '';
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
          site_metrics: siteMetrics
        });
      });
    });
  },

  timePeriod: function (secondDiff) {
    if (secondDiff > 60 * 60) {
      return self.round(secondDiff / 60 / 60) + ' hours';
    } else if (secondDiff > 60) {
      return self.round(secondDiff / 60) + ' minutes';
    } else {
      return secondDiff + ' seconds';
    }
  },

  round: function (value) {
    return Math.ceil(value * 100) / 100;
  },

  formatLinkKeyName: function (metricName, aNode, zNode) {
    switch (metricName) {
      case 'rssi':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RSSI',
          'Received Signal Strength Indicator',
          'phystatus.srssi'
        );
      case 'alive_perc':
      case 'alive_snr':
      case 'snr':
        // tgf.00:00:00:10:0d:45.phystatus.ssnrEst
        return self.createLinkMetric(
          aNode,
          zNode,
          'SnR',
          'Signal to Noise Ratio',
          'phystatus.ssnrEst'
        );
      case 'mcs':
        // tgf.38:3a:21:b0:05:d1.staPkt.mcs
        return self.createLinkMetric(
          aNode,
          zNode,
          'MCS',
          'MCS Index',
          'staPkt.mcs'
        );
      case 'per':
        // tgf.38:3a:21:b0:05:d1.staPkt.perE6
        return self.createLinkMetric(
          aNode,
          zNode,
          'PER',
          'Packet Error Rate',
          'staPkt.perE6'
        );
      case 'fw_uptime':
        // this depends on A/Z nodes and DN versus CN
        if (
          aNode.node_type === topologyTTypes.NodeType.DN &&
          zNode.node_type === topologyTTypes.NodeType.DN
        ) {
          // both sides DN, use keep-alive
          return self.createLinkMetric(
            aNode,
            zNode,
            'FW Uptime',
            'Mgmt Tx Keepalive Count',
            'mgmtTx.keepAlive'
          );
        } else if (
          aNode.node_type === topologyTTypes.NodeType.DN &&
          zNode.node_type === topologyTTypes.NodeType.CN
        ) {
          // DN->CN, use uplinkBwReq on DN?
          return {
            title: 'Uplink BW req',
            description: 'Uplink BW requests received by DN',
            scale: undefined,
            keys: [
              {
                node: aNode,
                keyName: 'tgf.' + zNode.mac_addr + '.mgmtRx.uplinkBwreq',
                titleAppend: ' (A)'
              }
            ]
          };
        } else if (
          aNode.node_type === topologyTTypes.NodeType.CN &&
          zNode.node_type === topologyTTypes.NodeType.DN
        ) {
          return {
            title: 'Uplink BW req',
            description: 'Uplink BW requests received by DN',
            scale: undefined,
            keys: [
              {
                node: zNode,
                keyName: 'tgf.' + aNode.mac_addr + '.mgmtRx.uplinkBwreq',
                titleAppend: ' (Z)'
              }
            ]
          };
        } else {
          throw new Error('Unhandled node type combination: ' +
                          aNode.name + '/' + zNode.name);
        }
      case 'rx_ok':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX Packets',
          'Received packets',
          'staPkt.rxOk'
        );
      case 'tx_ok':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX Packets',
          'Transferred packets',
          'staPkt.txOk'
        );
      case 'tx_bytes':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX bps',
          'Transferred bits/second',
          'tx_bytes',
          'link'
        );
      case 'rx_bytes':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX bps',
          'Received bits/second',
          'rx_bytes',
          'link'
        );
      case 'tx_errors':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX errors',
          'Transmit errors/second',
          'tx_errors',
          'link'
        );
      case 'rx_errors':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX errors',
          'Receive errors/second',
          'rx_errors',
          'link'
        );
      case 'tx_dropped':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX dropped',
          'Transmit dropped/second',
          'tx_dropped',
          'link'
        );
      case 'rx_dropped':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX dropped',
          'Receive dropped/second',
          'rx_dropped',
          'link'
        );
      case 'tx_pps':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX pps',
          'Transmit packets/second',
          'tx_packets',
          'link'
        );
      case 'rx_pps':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX pps',
          'Receive packets/second',
          'rx_packets',
          'link'
        );
      case 'tx_power':
        // tgf.38:3a:21:b0:05:d1.tpcStats.txPowerIndex
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX Power',
          'Transmit Power',
          'tpcStats.txPowerIndex'
        );
      case 'rx_frame':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX Frame',
          'RX Frame',
          'rx_frame',
          'link'
        );
      case 'rx_overruns':
        return self.createLinkMetric(
          aNode,
          zNode,
          'RX Overruns',
          'RX Overruns',
          'rx_overruns',
          'link'
        );
      case 'tx_overruns':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX Overruns',
          'TX Overruns',
          'tx_overruns',
          'link'
        );
      case 'tx_collisions':
        return self.createLinkMetric(
          aNode,
          zNode,
          'TX Collisions',
          'TX Collisions',
          'tx_collisions',
          'link'
        );
      case 'speed':
        return self.createLinkMetric(
          aNode,
          zNode,
          'Speed',
          'Speed (mbps)',
          'speed',
          'link'
        );
      case 'link_status':
        return [
          {
            title: 'Link status',
            description: 'Link status reported by controller',
            scale: undefined,
            keys: [
              {
                /* This is reported by controller MAC (TODO) */
                node: aNode,
                keyName:
                  'e2e_controller.link_status.WIRELESS.' +
                  aNode.mac_addr +
                  '.' +
                  zNode.mac_addr,
                titleAppend: ' (A)'
              }
            ]
          }
        ];
      case 'flaps':
        return [];
      default:
        throw new Error('Undefined metric: ' + metricName);
    }
  },

  createLinkMetric: function (
    aNode,
    zNode,
    title,
    description,
    keyName,
    keyPrefix = 'tgf'
  ) {
    return {
      title: title,
      description: description,
      scale: undefined,
      keys: [
        {
          node: aNode,
          keyName: keyPrefix + '.' + zNode.mac_addr + '.' + keyName,
          titleAppend: ' (A)'
        },
        {
          node: zNode,
          keyName: keyPrefix + '.' + aNode.mac_addr + '.' + keyName,
          titleAppend: ' (Z)'
        }
      ]
    };
  },

  fetchLinkKeyIds: function (metricName, aNode, zNode) {
    let keyIds = [];
    // skip if mac empty
    if (
      !aNode.mac_addr ||
      !aNode.mac_addr.length ||
      !zNode.mac_addr ||
      !zNode.mac_addr.length
    ) {
      return;
    }
    let linkKeys;
    try {
      linkKeys = self.formatLinkKeyName(metricName, aNode, zNode);
    } catch (e) {
      console.error('formatLinkKeyName error: ' + e);
      return keyIds;
    }
    linkKeys.keys.forEach(keyData => {
      if (
        aNode.mac_addr in self.nodeKeyIds &&
        keyData.keyName.toLowerCase() in self.nodeKeyIds[aNode.mac_addr]
      ) {
        let keyId =
          self.nodeKeyIds[aNode.mac_addr][keyData.keyName.toLowerCase()];
        keyIds.push(keyId);
      }
    });
    return keyIds;
  },

  /**
   * Query for a set of device and/or link metrics across the topology
   *
   * We need to walk all nodes and links, formatting each into key ids,
   * then mapping the key id back to a metric.
   */
  makeTableQuery: function (res, topology, nodeMetrics, linkMetrics) {
    // nodes by name
    let queries = [];
    let nodesByName = {};
    let nodesByMac = {};
    topology.nodes.forEach(node => {
      // clean-up state
      delete node.status_dump;
      nodesByName[node.name] = node;
      if (!node.mac_addr || !node.mac_addr.length) {
        return;
      }
      nodesByMac[node.mac_addr.toLowerCase()] = node.name;
    });
    // calculate query
    let nodeKeyIds = [];
    let nodeData = [];
    let duration = 24 * 60 * 60;
    let now = parseInt(new Date().getTime() / 1000);
    // [{mac, metric name, key name, key id}, ..]
    topology.nodes.forEach(node => {
      if (!node.mac_addr || !node.mac_addr.length) {
        return;
      }
      let macAddr = node.mac_addr.toLowerCase();
      nodeMetrics.forEach(nodeMetric => {
        if (
          macAddr in self.nodeKeyIds &&
          nodeMetric.metric.toLowerCase() in self.nodeKeyIds[macAddr]
        ) {
          let keyId = self.nodeKeyIds[macAddr][nodeMetric.metric.toLowerCase()];
          nodeKeyIds.push(keyId);
          nodeData.push({
            keyId: keyId,
            key: nodeMetric.metric,
            displayName: node.name
          });
        }
      });
    });
    queries.push({
      type: 'uptime_sec',
      key_ids: nodeKeyIds,
      data: nodeData,
      start_ts: now - duration,
      end_ts: now,
      agg_type: 'none'
    });
    // reset key list
    nodeKeyIds = [];
    nodeData = [];
    topology.links.forEach(link => {
      // ignore wired links
      if (link.link_type !== 1) {
        return;
      }
      let aNode = nodesByName[link.a_node_name];
      let zNode = nodesByName[link.z_node_name];
      // nodes without mac addrs set
      if (!aNode) {
        console.error("Can't find node name", link.a_node_name);
        let aNodeNameSplit = link.a_node_name.split('.');
        if (aNodeNameSplit.length !== 2) {
          return;
        }
        let aNodeName = aNodeNameSplit[0];
        Object.keys(nodesByName).forEach(nodeName => {
          if (nodeName.length > aNodeName.length) {
            let nodeNameSubstr = nodeName.substr(0, aNodeName.length);
            if (nodeNameSubstr === aNodeName) {
              console.error(
                '\tFound match for',
                link.a_node_name,
                '=',
                nodeName
              );
            }
          }
        });
        return;
      }
      if (!zNode) {
        return;
      }
      if (
        !aNode.mac_addr ||
        !aNode.mac_addr.length ||
        !zNode.mac_addr ||
        !zNode.mac_addr.length
      ) {
        return;
      }
      // add nodes to request list
      linkMetrics.forEach(linkMetric => {
        let linkKeys;
        try {
          linkKeys = self.formatLinkKeyName(linkMetric.metric, aNode, zNode);
        } catch (ex) {
          console.error('formatLinkKeyName error: ' + ex);
          return;
        }
        if (!linkKeys.hasOwnProperty('keys')) {
          return;
        }
        linkKeys.keys.forEach(keyData => {
          if (
            aNode.mac_addr in self.nodeKeyIds &&
            keyData.keyName.toLowerCase() in self.nodeKeyIds[aNode.mac_addr]
          ) {
            let keyId =
              self.nodeKeyIds[aNode.mac_addr][keyData.keyName.toLowerCase()];
            nodeKeyIds.push(keyId);
            nodeData.push({
              keyId: keyId,
              key: keyData.keyName,
              displayName: link.name,
              linkTitleAppend: '(A)'
            });
          } else if (
            zNode.mac_addr in self.nodeKeyIds &&
            keyData.keyName.toLowerCase() in self.nodeKeyIds[zNode.mac_addr]
          ) {
            let keyId =
              self.nodeKeyIds[zNode.mac_addr][keyData.keyName.toLowerCase()];
            nodeKeyIds.push(keyId);
            nodeData.push({
              keyId: keyId,
              key: keyData.keyName,
              displayName: link.name,
              linkTitleAppend: '(Z)'
            });
          }
        });
      });
    });
    queries.push({
      type: 'event',
      key_ids: nodeKeyIds,
      data: nodeData,
      start_ts: now - duration,
      end_ts: now,
      agg_type: 'none'
    });
    return { queries: queries };
  },

  fetchSysLogs: function (res, macAddr, sourceFile, offset, size, date) {
    let folder = DATA_FOLDER_PATH + macAddr + '/';
    let fileName = folder + date + '_' + sourceFile + '.log';

    fs.readFile(fileName, 'utf-8', function (err, data) {
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

  fetchEventLogs: function (res, macAddr, category, from, size, partition) {
    // execute query
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }

      let fields = [[macAddr], category, from, size];
      let queryString =
        EVENTLOG_BY_MAC_PART1 + '(' + partition + ') ' + EVENTLOG_BY_MAC_PART2;
      let sqlQuery = mysql.format(queryString, fields);
      conn.query(sqlQuery, function (err, results) {
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

  fetchAlerts: function (res, macAddr, from, size) {
    // execute query
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }

      let fields = [[macAddr], from, size];
      let sqlQuery = mysql.format(ALERTS_BY_MAC, fields);
      conn.query(sqlQuery, function (err, results) {
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
            trigger_value: row.trigger_value
          });
        });
        res.json(dataPoints);
      });
    });
  },

  deleteAlertsById: function (res, ids) {
    // execute query
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }

      let fields = [[ids]];
      let sqlQuery = mysql.format(DELETE_ALERTS_BY_ID, fields);
      conn.query(sqlQuery, function (err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
        }
      });
    });
  },

  deleteAlertsByMac: function (res, macAddr) {
    // execute query
    pool.getConnection(function (err, conn) {
      if (!conn || err) {
        console.error('Unable to get mysql connection');
        res.status(500).end();
        return;
      }

      let fields = [[macAddr]];
      let sqlQuery = mysql.format(DELETE_ALERTS_BY_MAC, fields);
      conn.query(sqlQuery, function (err, results) {
        conn.release();
        if (err) {
          console.log('Error', err);
        }
      });
    });
  }
};

module.exports = self;
