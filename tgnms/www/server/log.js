/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {LOG_LEVEL} = require('./config');
const winston = require('winston');
const {combine, label, printf, splat, timestamp} = winston.format;

function getLabel(callingModule) {
  const parts = callingModule.filename.split('/');
  return parts[parts.length - 2] + '/' + parts.pop();
}

const myFormat = printf(info => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

module.exports = callingModule => {
  return winston.createLogger({
    level: LOG_LEVEL,
    format: combine(
      label({label: getLabel(callingModule)}),
      timestamp(),
      splat(),
      myFormat,
    ),
    stderrLevels: ['error', 'warning'],
    transports: [new winston.transports.Console()],
  });
};
