/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {NODELOG_DIR} = require('../config');
const fs = require('fs');
const path = require('path');
const tail = require('tail');
const readline = require('readline');
const express = require('express');
const router = express.Router();
import {safePathJoin} from '../helpers/apiHelpers';

// Return the last N lines when tailing a log file
const N_LAST_LINES = 100;

function getLineIndicesInFile(filePath) {
  // Return an array of byte indices of lines (LF) in a file
  return new Promise((resolve, reject) => {
    const lines = [0];
    let index = 0;
    let fileBytes = 0;
    fs.createReadStream(filePath)
      .on('data', buffer => {
        for (let i = 0; i < buffer.length; i++) {
          index++;
          if (buffer[i] === 10 /* LF */) {
            lines.push(index);
          }
        }
        fileBytes += buffer.length;
      })
      .on('end', () => {
        if (lines[lines.length - 1] >= fileBytes) {
          lines.pop(); // remove last "line" if file ends in LF
        }
        resolve(lines);
      })
      .on('error', reject);
  });
}

function getLogFiles(macAddr) {
  // Return all newest, uncompressed log files for a given MAC address
  // Return format:
  //   {log_name: {filename, mtime}}
  const LOG_FILENAME_PATTERN = /^[0-9-]+_terragraph_(.+)_logs\.log$/;

  // Check if the log directory exists
  return new Promise((resolve, reject) => {
    const logDir = safePathJoin(NODELOG_DIR, macAddr);
    fs.stat(logDir, (err, stats) => {
      if (err || !stats.isDirectory()) {
        reject();
        return;
      }

      // Iterate through log files
      fs.readdir(logDir, (err2, files) => {
        if (err2) {
          reject();
          return;
        }

        const logFiles = {};
        files.forEach(file => {
          // Filter out non-files and compressed logs
          const logPath = path.join(logDir, file);
          let stats2;
          try {
            stats2 = fs.statSync(logPath);
          } catch (e) {
            return;
          }
          if (!stats2.isFile()) {
            return;
          }

          // Record only the latest file for each type of log
          const match = file.match(LOG_FILENAME_PATTERN);
          if (!match || match.length !== 2) {
            return;
          }
          if (
            !logFiles.hasOwnProperty(match[1]) ||
            stats2.mtime.getTime() > logFiles[match[1]].mtime.getTime()
          ) {
            logFiles[match[1]] = {filename: file, mtime: stats2.mtime};
          }
        });
        resolve(logFiles);
      });
    });
  });
}

router.post('/:mac', (req, res) => {
  // Return all log files for this node
  const {mac} = req.params;

  getLogFiles(mac)
    .then(logFiles => res.status(200).send({files: Object.keys(logFiles)}))
    .catch(_err => res.status(500).end());
});

router.ws('/:mac/:logfile', (ws, req) => {
  // Tail the given log file
  const {mac, logfile} = req.params;

  const logDir = safePathJoin(NODELOG_DIR, mac);
  const onError = () => {
    ws.send('========== An error occurred. Closing connection... ==========');
    ws.close();
  };

  getLogFiles(mac)
    .then(logFiles => {
      // Construct the actual filename
      if (!logFiles.hasOwnProperty(logfile)) {
        onError();
        return;
      }

      const logPath = path.join(logDir, logFiles[logfile].filename);
      getLineIndicesInFile(logPath).then(lines => {
        // Read last N lines of file
        const start = lines[Math.max(lines.length - N_LAST_LINES, 0)];
        const reader = readline.createInterface({
          input: fs.createReadStream(logPath, {start}),
        });
        reader.on('line', line => ws.send(line));

        // When reading finishes...
        reader.on('close', () => {
          // Create tailer
          const tailer = new tail.Tail(logPath);
          ws.on('close', (_code, _reason) => tailer.unwatch());

          // Tail lines
          tailer.on('line', data => ws.send(data));
          tailer.on('error', error => {
            console.error(error);
            onError();
          });
        });
      });
    })
    .catch(_err => onError());
});

module.exports = router;
