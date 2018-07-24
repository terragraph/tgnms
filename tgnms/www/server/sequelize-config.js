/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const {MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB} = require('./config');
const logger = require('./log')(module);

module.exports = {
  development: {
    username: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB,
    host: MYSQL_HOST,
    dialect: 'mysql',
    logging: msg => logger.info(msg),
  },
  production: {
    username: MYSQL_USER,
    password: MYSQL_PASS,
    database: MYSQL_DB,
    host: MYSQL_HOST,
    dialect: 'mysql',
    logging: msg => logger.info(msg),
  },
};
