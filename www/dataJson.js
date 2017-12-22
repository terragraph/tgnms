// aggregate data points in buckets for easier grouping
const AGG_BUCKET_SECONDS = 30;
const DATA_FOLDER_PATH = "/home/nms/data/";
const fs = require("fs");
const mysql = require("mysql");
const pool = mysql.createPool({
  connectionLimit: 50,
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "cxl",
  queueLimit: 10,
  waitForConnections: false
});
pool.on("enqueue", function() {
  console.log("Waiting for available connection slot");
});
pool.on("error", function() {
  console.log("pool error");
});

// Convert thrift's Int64 (after conversion to plain json) to a number
// Precision might be lost if the int is >= 2^53
const toUint64 = thriftInt64 => {
  return Buffer.from(thriftInt64.buffer.data).readUIntBE(0, 8);
};

var self = {
  macAddrToNode: {},
  nodeNameToNode: {},

  refreshNodes: function() {
    pool.getConnection(function(err, conn) {
      if (err) {
        console.error("DB error", err);
        return;
      }
      conn.query("SELECT * FROM `nodes`", function(err, results) {
        results.forEach(row => {
          self.macAddrToNode[row.mac.toLowerCase()] = row;
          if (!(row.network in self.nodeNameToNode)) {
            self.nodeNameToNode[row.network] = {};
          }
          self.nodeNameToNode[row.network][row.node] = row;
        });
        conn.release();
      });
    });
  },

  writeScanResults: function(network, scan_results) {
    var rows = [];
    let refreshNodesList = false;

    Object.keys(scan_results.scans).forEach(token => {
      var scanData = scan_results.scans[token];
      if (!self.nodeNameToNode[network][scanData.txNode]) {
        console.error(
          "writeScanResults: txNode " + scanData.txNode + " not present in DB"
        );
        refreshNodesList = true;
        return;
      }
      var tx_node_id = self.nodeNameToNode[network][scanData.txNode].id;
      var start_bwgd = toUint64(scanData.startBwgdIdx);
      Object.keys(scanData.responses).forEach(rx_node_name => {
        if (!self.nodeNameToNode[network][rx_node_name]) {
          console.error(
            "writeScanResults: rxNode " + rx_node_name + " not present in DB"
          );
          refreshNodesList = true;
          return;
        }
        var rx_node_id = self.nodeNameToNode[network][rx_node_name].id;
        var scanResp = scanData.responses[rx_node_name];
        var superframe_num = toUint64(scanResp.curSuperframeNum);

        scanResp.routeInfoList.forEach(route_info => {
          var row = [
            token,
            tx_node_id,
            start_bwgd,
            rx_node_id,
            superframe_num,
            route_info.route.tx,
            route_info.route.rx,
            route_info.rssi,
            route_info.snrEst,
            route_info.postSnr,
            route_info.rxStart,
            route_info.packetIdx
          ];
          rows.push(row);
        });
      });
    });

    if (refreshNodesList) {
      self.refreshNodes();
    }
    if (!rows.length) {
      return;
    }

    pool.getConnection(function(err, conn) {
      if (err) {
        console.error("DB error", err);
        return;
      }
      conn.query(
        "INSERT INTO scan_results" +
          "(`token`, `tx_node_id`, `start_bwgd`, `rx_node_id`, `superframe_num`, " +
          "`tx_beam`, `rx_beam`, `rssi`, `snr_est`, `post_snr`, `rx_start`, `packet_idx`) VALUES ?",
        [rows],
        function(err, result) {
          if (err) {
            console.log("Some error", err);
          }
          console.log("wrote " + rows.length + " rows into scan_results");
          conn.release();
        }
      );
    });
  }
};

module.exports = self;
