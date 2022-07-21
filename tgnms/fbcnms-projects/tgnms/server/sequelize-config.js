/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASS,
  MYSQL_DB,
  SQLITE_DB,
} = require('./config');
const logger = require('./log')(module);

module.exports = {
  development: {
    username: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB,
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    dialect: SQLITE_DB ? 'sqlite' : 'mysql',
    storage: SQLITE_DB,
    logging: msg => logger.debug(msg),
  },
  production: {
    username: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB,
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    dialect: 'mysql',
    logging: msg => logger.debug(msg),
  },
};
