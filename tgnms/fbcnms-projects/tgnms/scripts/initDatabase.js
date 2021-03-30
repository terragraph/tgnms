/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

const logger = require('../server/log')(module);
const {sequelize} = require('../server/models');

const path = require('path');
const {DataTypes} = require('sequelize');
const Umzug = require('umzug');

const umzugMigrations = new Umzug({
  storage: 'sequelize',
  storageOptions: {
    sequelize,
  },
  // The logging function.
  // A function that gets executed everytime migrations start and have ended.
  logging: msg => logger.info(msg),
  // The name of the positive method in migrations.
  upName: 'up',
  // The name of the negative method in migrations.
  downName: 'down',
  migrations: {
    // The params that gets passed to the migrations.
    // Might be an array or a synchronous function which returns an array.
    params: [sequelize.getQueryInterface(), DataTypes],
    // The path to the migrations directory.
    path: path.join(__dirname, '..', 'server/migrations'),
    // The pattern that determines whether or not a file is a migration.
    pattern: /^\d+[\w-]+\.js$/,
    // A function that receives and returns the to be executed function.
    // This can be used to modify the function.
    wrap(func) {
      return func;
    },
  },
});

const umzugSeeders = new Umzug({
  storage: 'sequelize',
  storageOptions: {
    sequelize,
  },
  // The logging function.
  // A function that gets executed everytime migrations start and have ended.
  logging: msg => logger.info(msg),
  // The name of the positive method in migrations.
  upName: 'up',
  // The name of the negative method in migrations.
  downName: 'down',
  migrations: {
    // The params that gets passed to the migrations.
    // Might be an array or a synchronous function which returns an array.
    params: [sequelize.getQueryInterface(), DataTypes],
    // The path to the migrations directory.
    path: path.join(__dirname, '..', 'server/seeders'),
    // The pattern that determines whether or not a file is a migration.
    pattern: /^\d+[\w-]+\.js$/,
    // A function that receives and returns the to be executed function.
    // This can be used to modify the function.
    wrap(func) {
      return func;
    },
  },
});

export async function runMigrations() {
  // run migrations once tables exist
  const pendingMigrations = await umzugMigrations.pending();
  if (pendingMigrations) {
    await umzugMigrations.up();
  }
}

export async function rollbackMigrations() {
  const executedMigrations = await umzugMigrations.executed();
  if (executedMigrations) {
    await umzugMigrations.down();
  }
}

export async function runSeeders() {
  const pendingSeeders = await umzugSeeders.pending();
  if (pendingSeeders) {
    await umzugSeeders.up();
  }
}

export default umzugMigrations;
