// aggregate data points in buckets for easier grouping
const AGG_BUCKET_SECONDS = 30;
const KEY_WHITELIST = new Set([
  'uptime',
  'load-1', 'load-5', 'load-15',
]);
const KEY_WHITELIST_SUFFIX = new Set([
  'srssi', 'spostSNRdB', 'ssnrEst'
]);
const KEY_WHITELIST_PREFIX = new Set([
  'aquaman',
  'decision',
  'e2e_minion',
  'e2e_controller',
  'eth0',
  'link',
  'link_status',
  'mem',
  'mount',
  'nic0',
  'nic1',
  'nic2',
  'nss_fib',
  'procs',
  'spark',
  'terra0',
  'tgf',
]);
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
var self = {
  macAddrToNodeId: {},
  filenameToSourceId: {},
  timeBucketIds: {},
  nodeKeyIds: {},
  droppedKeyNames: new Set(),
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

  timeAlloc: function() {
    // pre allocate time buckets
    let timeBuckets = [];
    for (let i = 0; i <= 90; i+= 30) {
      let nextAlloc = new Date(
        Math.ceil((new Date().getTime() + i * 1000) / AGG_BUCKET_SECONDS / 1000)
        * AGG_BUCKET_SECONDS * 1000);
      timeBuckets.push([nextAlloc]);
    }
    // insert unique macs
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('INSERT IGNORE INTO `ts_time` (`time`) VALUES ?',
        [timeBuckets],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new times', err);
          }
          conn.release();
        }
      );
    });
    // refresh time ids
    self.refreshNodeKeyTimes();
  },

  scheduleTimeAlloc: function() {
    setInterval(self.timeAlloc, AGG_BUCKET_SECONDS * 1000);
  },

  refreshNodeIds: function() {
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('SELECT `id`, `mac` FROM `nodes`',
        function(err, results) {
          results.forEach(row => {
            self.macAddrToNodeId[row.mac.toLowerCase()] = row.id;
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
            self.nodeKeyIds[row.node_id][row.key] = row.id;
          });
        }
      );
      // dropped keys
      conn.query('SELECT `key` FROM ts_key_dropped',
        function(err, results) {
          results.forEach(row => {
            self.droppedKeyNames.add(row.key);
          });
        }
      );
      // only query the latest ~hour of time stamps
      // anything older shouldn't be written anyways
      conn.query('SELECT `id`, `time` FROM ts_time ' +
                 'WHERE `time` > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        function(err, results) {
          results.forEach(row => {
            self.timeBucketIds[row.time] = row.id;
          });
          conn.release();
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

  updateNodeIds: function(macAddrs) {
    if (!macAddrs.length) {
      return;
    }
    let insertMacs = [];
    macAddrs.forEach(item => {
      insertMacs.push([item]);
    });
    // insert unique macs
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      conn.query('INSERT IGNORE INTO `nodes` (`mac`) VALUES ?',
        [insertMacs],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new nodes', err);
          }
          conn.release();
        }
      );
    });
    self.refreshNodeIds();
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
   * Accepts a list of keys that we've dropped
   */
  updateDroppedKeys: function(keyNames) {
    if (!keyNames.length) {
      return;
    }
    // insert node/key combos
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error('DB error', err);
        return;
      }
      let sqlQuery = conn.query('INSERT IGNORE INTO `ts_key_dropped` (`key`) VALUES ?',
        [keyNames.map(keyName => [keyName])],
        function (err, rows) {
          if (err) {
            console.log('Error inserting new dropped keys', err);
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
    // agents, topology
    let rows = [];
    let unknownMacs = new Set();
    let missingNodeKey = new Set();
    let droppedKeys = new Set();
    let badTime = 0;
    data.agents.forEach(agent => {
      agent.stats.forEach(stat => {
        // check key
        let keyNameSplit = stat.key.split(".");
        if (!KEY_WHITELIST.has(stat.key) &&
            (keyNameSplit.length != 4 ||
             !KEY_WHITELIST_SUFFIX.has(keyNameSplit[3])) &&
            (keyNameSplit.length <= 1 ||
             !KEY_WHITELIST_PREFIX.has(keyNameSplit[0]))) {
          // log dropped keys
          if (!self.droppedKeyNames.has(stat.key) &&
              !droppedKeys.has(stat.key)) {
            droppedKeys.add(stat.key);
          }
          return;
        }
        // missing node in table
        if (!(agent.mac.toLowerCase() in self.macAddrToNodeId)) {
          unknownMacs.add(agent.mac.toLowerCase());
          console.log('unknown mac', agent.mac);
          return;
        }
        let nodeId = self.macAddrToNodeId[agent.mac.toLowerCase()];
        let tsParsed = self.timeCalc(stat.ts);
        if (!tsParsed) {
          badTime++;
          console.log('bad time', stat);
          return;
        }
        // verify time id exists
        if (!(tsParsed in self.timeBucketIds)) {
          console.log('Time slot not found', tsParsed, 'in',
                      self.timeBucketIds.length, 'buckets');
          return;
        }
        let timeId = self.timeBucketIds[tsParsed];
        // verify node/key combo exists
        if (nodeId in self.nodeKeyIds &&
            stat.key in self.nodeKeyIds[nodeId]) {
          // found node/key id for insert
          let row = [timeId,
                     self.nodeKeyIds[nodeId][stat.key],
                     stat.value];
          rows.push(row);
        } else {
          console.log('Missing cache for', nodeId, '/', stat.key);
          missingNodeKey.add([nodeId, stat.key]);
        }
      });
    });
    // write newly found macs
    self.updateNodeIds(Array.from(unknownMacs));
    // write newly found node/key combos
    self.updateNodeKeys(Array.from(missingNodeKey));
    // keep track of keys we're dropping
    self.updateDroppedKeys(Array.from(droppedKeys));
    // insert rows
    let insertRows = function(tableName, rows, remain) {
      pool.getConnection(function(err, conn) {
        if (err) {
          console.error('DB error', err);
          return;
        }
        conn.query('INSERT INTO ' + tableName +
                   '(`time_id`, `key_id`, `value`) VALUES ?',
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
                  remain, "remaining");
    };
    if (rows.length) {
      let bucketSize = 10000;
      let remainRows = rows;
      while (remainRows.length > bucketSize) {
        // slice rows into buckets of 10k rows
        let sliceRows = remainRows.slice(0, bucketSize);
        insertRows('ts_value', sliceRows, remainRows.length);
        remainRows = remainRows.splice(bucketSize);
      }
      insertRows('ts_value', remainRows, 0);
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
    let unknownMacs = new Set();
    let missingNodeFilenames = [];
    let badTime = 0;

    // missing node in table
    if (!(data.node_mac in self.macAddrToNodeId)) {
      unknownMacs.add(data.node_mac);
      console.log('unknown mac', data.node_mac);
      // write newly found macs
      self.updateNodeIds(Array.from(unknownMacs));
      return;
    }
    let nodeId = self.macAddrToNodeId[data.node_mac];
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
    let unknownMacs = new Set();
    let missingNodeCategories = [];
    let badTime = 0;
    data.agents.forEach(agent => {
      // missing node in table
      if (!(agent.mac in self.macAddrToNodeId)) {
        unknownMacs.add(agent.mac);
        console.log('unknown mac', agent.mac);
        return;
      }
      let nodeId = self.macAddrToNodeId[agent.mac];

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
    self.updateNodeIds(Array.from(unknownMacs));
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
