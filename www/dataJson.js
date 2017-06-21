// aggregate data points in buckets for easier grouping
const AGG_BUCKET_SECONDS = 30;
const DATA_FOLDER_PATH = '/home/nms/data/';
const fs = require('fs');
const mysql = require('mysql');
const pool = mysql.createPool({
    connectionLimit:    50,
    host:               '127.0.0.1',
    user:               'root',
    password:           '',
    database:           'cxl',
    queueLimit:         10,
    waitForConnections: false,
});
pool.on('enqueue', function () {
  console.log('Waiting for available connection slot');
});
pool.on('error', function() {
  console.log('pool error');
});
// beringei client
const thrift = require('thrift');
const BeringeiService = require('./thrift/gen-nodejs/BeringeiService');
const beringeiTypes = require('./thrift/gen-nodejs/beringei_data_types');
const transport = thrift.TFramedTransport;
const protocol = thrift.TBinaryProtocol;
const beringeiConn = thrift.createConnection("localhost", 9999, {
  transport: transport,
  protocol: protocol,
});
beringeiConn.on('error', (err) => {
  console.log('Beringei error', err)
});
const beringeiClient = thrift.createClient(BeringeiService, beringeiConn);

var self = {
  macAddrToNode: {},
  filenameToSourceId: {},
  timeBucketIds: {},
  nodeKeyIds: {},
  nodeFilenameIds: {},
  nodeCategoryIds: {},

  init: function() {

    // Create data folder if it does not exist
    fs.mkdir(DATA_FOLDER_PATH, function (err) {
      if (err) {
        // ignore error
      }
    });

  },

  refreshNodes: function() {
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT * FROM `nodes`',
        function(err, results) {
          results.forEach(row => {
            self.macAddrToNode[row.mac.toLowerCase()] = row;
          });
          conn.release();
        }
      );
    });
  },

  /*
   * Refresh node key mappings, dropped key names, and time bucket ids
   * TODO: This should be split up so we don't need to refresh everything
   * on each update
   */
  refreshNodeKeyTimes: function() {
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT `id`, `node_id`, `key` FROM ts_key',
        function(err, results) {
          results.forEach(row => {
            if (!(row.node_id in self.nodeKeyIds)) {
              self.nodeKeyIds[row.node_id] = {};
            }
            self.nodeKeyIds[row.node_id][row.key.toLowerCase()] = row.id;
          });
        }
      );
    });
  },

  refreshNodeCategories: function() {
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT `id`, `node_id`, `category` FROM event_categories',
        function(err, results) {
          results.forEach(row => {
            if (!(row.node_id in self.nodeCategoryIds)) {
              self.nodeCategoryIds[row.node_id] = {};
            }
            self.nodeCategoryIds[row.node_id][row.category] = row.id;
          });
        }
      );
    });
  },

  addNodes: function(newNodes) {
    if (!Object.keys(newNodes).length) {
      return;
    }
    let nodesData = [];
    Object.keys(newNodes).forEach(nodeKey => {
      node = newNodes[nodeKey];
      nodesData.push([node.mac.toLowerCase(), node.name, node.site, node.network]);
      console.log('Inserting new node: mac: ' + node.mac + ' name: ' + node.name + ' site: ' + node.site + ' network: ' + node.network);
    });
    // insert unique macs
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('INSERT IGNORE INTO `nodes` (`mac`, `node`, `site`, `network`) VALUES ?',
        [nodesData],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new nodes', err);
          }
          conn.release();
        }
      );
    });
    self.refreshNodes();
  },

  updateNodes: function(nodesToUpdate) {
    if (!Object.keys(nodesToUpdate).length) {
      return;
    }
    let nodesData = [];
    Object.keys(nodesToUpdate).forEach(nodeId => {
      node = nodesToUpdate[nodeId];
      nodesData.push([node.id, node.mac.toLowerCase(), node.name, node.site, node.network]);
      console.log('Updating node: mac: ' + node.mac + ' name: ' + node.name + ' site: ' + node.site + ' network: ' + node.network);
    });
    // insert unique macs
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('INSERT into `nodes` (`id`, `mac`, `node`, `site`, `network`) VALUES ? ' +
                 'ON DUPLICATE KEY UPDATE `node` = VALUES(`node`), `site` = VALUES(`site`), `network` = VALUES(`network`)',
        [nodesData],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new nodes', err);
          }
          conn.release();
        }
      );
    });
    self.refreshNodes();
  },

  /*
   * Accepts a list of <node, key> to generate new ids
   */
  updateNodeKeys: function(nodeKeys) {
    if (!nodeKeys.length) {
      return;
    }
    // insert node/key combos
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      let sqlQuery = conn.query('INSERT IGNORE INTO `ts_key` (`node_id`, `key`) VALUES ?',
        [nodeKeys],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new node/keys', err);
          }
          conn.release();
        }
      );
    });
    self.refreshNodeKeyTimes();
  },

  /*
   * Accepts a list of <node, category> to generate new ids
   */
  updateNodeCategories: function(NodeCategories) {
    if (!NodeCategories.length) {
      return;
    }

    console.log("updateNodeCategories");
    console.log(NodeCategories);
    // insert node/key combos
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      let sqlQuery = conn.query('INSERT IGNORE INTO `event_categories` (`node_id`, `category`) VALUES ?',
        [NodeCategories],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new node/categories', err);
          }
          conn.release();
        }
      );
    });
    self.refreshNodeCategories();
  },

  timeCalc: function(timeInNs) {
    let min = 1480000000000000000;
    let max = 1500000000000000000;
    if (timeInNs < max && timeInNs > min) {
      // looks like the time format we're expecting, proceed
      let d = new Date(
        Math.ceil(timeInNs / 1000000000 / AGG_BUCKET_SECONDS)
        * AGG_BUCKET_SECONDS * 1000);
      return d;
    } else {
      // just use current time
      return new Date(
        Math.ceil(new Date().getTime() / AGG_BUCKET_SECONDS / 1000)
        * AGG_BUCKET_SECONDS * 1000);
    }
  },

  timeCalcUsec: function(timeInUs) {
    let min = 1480000000000000;
    let max = 1500000000000000;
    if (timeInUs < max && timeInUs > min) {
      // looks like the time format we're expecting, proceed
      let d = new Date(timeInUs/1000);
      return d;
    } else {
      return new Date();
    }
  },

  writeData: function(postData) {
    let data = JSON.parse(postData);
    // beringei data
    let bRows = [];
    let unknownNodes = {};
    let nodesToUpdate = {};
    let missingNodeKey = new Set();
    let badTime = 0;
    let topologyName = data.topology? data.topology.name : "";

    data.agents.forEach(agent => {
      // missing node in table
      if (!(agent.mac.toLowerCase() in self.macAddrToNode)) {
        var newNode = {mac: agent.mac.toLowerCase(), name: agent.name, site: agent.site, network: topologyName};
        unknownNodes[newNode.mac] = newNode;
        console.log('unknown mac', agent.mac);
        return;
      }
      let node = self.macAddrToNode[agent.mac.toLowerCase()];
      let nodeId = node.id;

      if (!node.network || node.network.length < 1) {
        var updateNode = {id: nodeId, mac: agent.mac.toLowerCase(), name: agent.name, site: agent.site, network: topologyName};
        nodesToUpdate[nodeId] = updateNode;
      }

      agent.stats.forEach(stat => {
        // check key
        let tsParsed = self.timeCalc(stat.ts);
        if (!tsParsed) {
          badTime++;
          console.log('bad time', stat);
          return;
        }
        // verify node/key combo exists
        if (nodeId in self.nodeKeyIds &&
            stat.key.toLowerCase() in self.nodeKeyIds[nodeId]) {
          // insert row for beringei
          let bKey = new beringeiTypes.Key();
          bKey.key = "" + self.nodeKeyIds[nodeId][stat.key.toLowerCase()];
          let bRow = new beringeiTypes.DataPoint();
          bRow.key = bKey;
          let timePair = new beringeiTypes.TimeValuePair();
          timePair.unixTime = tsParsed.getTime() / 1000;
          timePair.value = stat.value;
          bRow.value = timePair;
          bRows.push(bRow);
        } else {
          console.log('Missing cache for', nodeId, '/', stat.key);
          missingNodeKey.add([nodeId, stat.key.toLowerCase()]);
        }
      });
    });
    // write newly found macs
    self.addNodes(unknownNodes);
    // Update nodes missing some details
    self.updateNodes(nodesToUpdate);
    // write newly found node/key combos
    self.updateNodeKeys(Array.from(missingNodeKey));
    // insert rows
    if (bRows.length) {
      // insert into beringei
      let beringeiPutReq = new beringeiTypes.PutDataRequest();
      beringeiPutReq.data = bRows;
      beringeiClient.putDataPoints(beringeiPutReq, (err, resp) => {
        if (err) {
          console.log('Beringei error', err);
        }
        console.log('Beringei data written', resp);
      });
    } else {
      console.log('writeData request with', postData.length, 'bytes and',
                  badTime, 'invalid timestamp failures');
    }
  },

  writeLogs: function(postData) {
    let data = JSON.parse(postData);
    let d = new Date();
    let day = (d.getMonth() + 1) + '-' + d.getDate() + '-' + d.getFullYear();

    data.agents.forEach(agent => {
      let folder = DATA_FOLDER_PATH + agent.mac + '/';
      fs.mkdir(folder, function (errDir) {
        agent.logs.forEach(logMsg => {
          let fileName = folder + day + '_' + logMsg.file + ".log";
          fs.appendFile(fileName, logMsg.log + '\n', function (errFile) {
            if (errFile) {
              console.error(errFile);
            }
          });
        });
      });
    });
  },

  writeAlerts: function(postData) {
    let data = JSON.parse(postData);
    let rows = [];
    let unknownNodes = {};
    let missingNodeFilenames = [];
    let badTime = 0;

    // missing node in table
    if (!(data.node_mac in self.macAddrToNode)) {
      var newNode = {mac: data.node_mac.toLowerCase(), name: data.node_name, site: data.node_site, network: data.node_topology};
      unknownNodes[newNode.mac] = newNode;
      console.log('unknown mac', data.node_mac);
      // write newly found macs
      self.addNodes(unknownNodes);
      return;
    }
    let node = self.macAddrToNode[data.node_mac.toLowerCase()];
    let nodeId = node.id;
    let row = [nodeId,
               self.timeCalcUsec(data.timestamp),
               data.alert_id,
               data.alert_regex,
               data.alert_threshold,
               data.alert_comparator,
               data.alert_level,
               data.trigger_key,
               data.trigger_value];
    rows.push(row);

    // insert rows
    let insertRows = function(tableName, rows, remain) {
      pool.getConnection(function(err, conn) {
        if (err) {
          console.error('DB error', err);
          return;
        }
        conn.query('INSERT INTO ' + tableName +
                   '(`node_id`, `timestamp`, `alert_id`, `alert_regex`, `alert_threshold`, `alert_comparator`, `alert_level`, `trigger_key`, `trigger_value`) VALUES ?',
                   [rows],
          function(err, result) {
            if (err) {
              console.log('Some error', err);
            }
            conn.release();
          }
        );
      });
      console.log("Inserted", rows.length, "rows into", tableName,
                  ",", remain, "remaining");
    };
    if (rows.length) {
      let bucketSize = 10000;
      let remainRows = rows;
      while (remainRows.length > bucketSize) {
        // slice rows into buckets of 10k rows
        let sliceRows = remainRows.slice(0, bucketSize);
        insertRows('alerts', sliceRows, remainRows.length);
        remainRows = remainRows.splice(bucketSize);
      }
      insertRows('alerts', remainRows, 0);
    } else {
      console.log('writeLogs request with', postData.length, 'bytes and',
                  badTime, 'invalid timestamp failures');
    }
  },

  writeEvents: function(postData) {
    let data = JSON.parse(postData);
    // agents, topology
    let rows = [];
    let unknownNodes = {};
    let missingNodeCategories = [];
    let badTime = 0;
    let topologyName = data.topology? data.topology.name : "";

    data.agents.forEach(agent => {
      // missing node in table
      if (!(agent.mac.toLowerCase() in self.macAddrToNode)) {
        var newNode = {mac: agent.mac.toLowerCase(), name: agent.name, site: agent.site, network: topologyName};
        unknownNodes[newNode.mac] = newNode;
        console.log('unknown mac', agent.mac);
        return;
      }
      let node = self.macAddrToNode[agent.mac.toLowerCase()];
      let nodeId = node.id;

      agent.events.forEach(eventMsg => {
        // verify node/category combo exists
        if (nodeId in self.nodeCategoryIds &&
            eventMsg.category in self.nodeCategoryIds[nodeId]) {
          // found node/category id for insert
          let row = [eventMsg.sample,
                     self.timeCalcUsec(eventMsg.ts),
                     self.nodeCategoryIds[nodeId][eventMsg.category]];
          rows.push(row);
        } else {
          ;
          if (!missingNodeCategories.some(function(a){return ((a[0] === nodeId) && (a[1] === eventMsg.category))})) {
            console.log('Missing cache for', nodeId, '/', eventMsg.category);
            missingNodeCategories.push([nodeId, eventMsg.category]);
          }
        }
      });
    });
    // write newly found macs
    self.addNodes(unknownNodes);
    // write newly found node/category combos
    self.updateNodeCategories(missingNodeCategories);
    // insert rows
    let insertRows = function(tableName, rows, remain) {
      pool.getConnection(function(err, conn) {
        if (err) {
          console.log('pool error', err);
          return;
        }
        conn.query('INSERT INTO ' + tableName +
                   '(`sample`, `timestamp`, `category_id`) VALUES ?',
                   [rows],
          function(err, result) {
            if (err) {
              console.log('Some error', err);
            }
            conn.release();
          }
        );
      });
      console.log("Inserted", rows.length, "rows into", tableName,
                  ",", remain, "remaining");
    };
    if (rows.length) {
      let bucketSize = 10000;
      let remainRows = rows;
      while (remainRows.length > bucketSize) {
        // slice rows into buckets of 10k rows
        let sliceRows = remainRows.slice(0, bucketSize);
        insertRows('events', sliceRows, remainRows.length);
        remainRows = remainRows.splice(bucketSize);
      }
      insertRows('events', remainRows, 0);
    } else {
      console.log('writeEvents request with', postData.length, 'bytes and',
                  badTime, 'invalid timestamp failures');
    }
  }
}

module.exports = self;
