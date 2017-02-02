// aggregate data points in buckets for easier grouping
const AGG_BUCKET_SECONDS = 30;
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

  refreshNodeIds: function() {
    pool.getConnection(function(err, conn) {
      conn.query('SELECT `id`, `mac` FROM `nodes`',
        function(err, results) {
          results.forEach(row => {
            self.macAddrToNodeId[row.mac] = row.id;
          });
          conn.release();
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

  timeCalc: function(timeInNs, row) {
    let min = 1480000000000000000;
    let max = 1500000000000000000;
    if (timeInNs < max && timeInNs > min) {
      // looks like the time format we're expecting, proceed
      let d = new Date(
        Math.ceil(timeInNs / 1000000 / AGG_BUCKET_SECONDS * 1000)
        * AGG_BUCKET_SECONDS * 1000);
      return d;
    } else {
//      console.log('bad time', timeInNs, row);
      // just use current time
      return new Date(
        Math.ceil(new Date().getTime() / AGG_BUCKET_SECONDS * 1000)
        * AGG_BUCKET_SECONDS * 1000);
    }
  },

  writeData: function(postData) {
    let usedKeys = new Set(['terra0.tx_bytes', 'terra0.rx_bytes',
                            'uptime',
                            'procs.total',
                            'mount.util:/',
                            'load-1', 'load-5', 'load-15',
                            'mem.free', 'mem.total', 'mem.util',
                            'terra0.tx_dropped', 'terra0.rx_dropped',
                            'terra0.tx_errors', 'terra0.rx_errors']);
    let allowedTgSuffix = new Set(['srssi', 'spostSNRdB', 'ssntEst']);
    let rows = [];
    let unknownMacs = new Set();
    let macAddr;
    let postDataLines = postData.split("\n");
    let noColumns = 0;
    let badTime = 0;
    let noMac = 0;
    postDataLines.forEach(line => {
      let columns = line.split(",");
      if (columns <= 1) {
        noColumns++;
        return;
      }
      let tableName;
      let dataMap = {};
      let ts;
      for (let i = 0; i < columns.length; i++) {
        let column = columns[i];
        if (i == 0) {
          tableName = column;
        } else if (columns.length == (i + 1)) {
          // last column
          let valueSplit = column.split(" ");
          valueSplit.forEach(value => {
            let kvSplit = value.split("=");
            if (kvSplit.length == 2) {
              // key, value
              dataMap[kvSplit[0]] = kvSplit[1];
            } else {
              // last value is time
              ts = value;
            }
          });
        } else {
          // regular data
          let kvSplit = column.split("=");
          dataMap[kvSplit[0]] = kvSplit[1];
        }
      }
      // use mac, might be 'node' or 'mac' for name
      let macAddr = dataMap.mac || dataMap.node;
      let keyName = dataMap.key || dataMap.name;
      if (macAddr in self.macAddrToNodeId &&
          keyName &&
          dataMap.value) {
        let tsParsed = self.timeCalc(ts, line);
        if (!tsParsed) {
          badTime++;
          return;
        }
        let row = [self.macAddrToNodeId[macAddr],
                  keyName,
                  tsParsed,
                  dataMap.value];
        if (usedKeys.has(keyName)) {
          rows.push(row);
        } else {
          // fw stats
          let keyNameSplit = keyName.split(".");
          if (keyNameSplit.length == 4 &&
              allowedTgSuffix.has(keyNameSplit[3])) {
            rows.push(row);
          }
        }
      } else if (macAddr) {
        noMac++;
        unknownMacs.add(macAddr);
      } else {
        console.log("bad data, exiting", line);
      }
    });
    // write newly found macs
    self.updateNodeIds(Array.from(unknownMacs));
    // insert rows
    let insertRows = function(tableName, rows, remain) {
      pool.getConnection(function(err, conn) {
        if (err) {
          console.log('pool error', err);
          return;
        }
        conn.query('INSERT INTO ' + tableName +
                   '(`node_id`, `key`, `time`, ' +
                   '`value`) VALUES ?',
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
        insertRows('time_series', sliceRows, remainRows.length);
        remainRows = remainRows.splice(bucketSize);
      }
      insertRows('time_series', remainRows, 0);
    } else {
      console.log('writeData request with', postData.length, 'bytes and',
                  postDataLines.length, 'lines had:', noColumns,
                  'zero-data columns,', noMac, 'mac addr lookup failures,',
                  badTime, 'invalid timestamp failures');
    }
  }
}

module.exports = self;
