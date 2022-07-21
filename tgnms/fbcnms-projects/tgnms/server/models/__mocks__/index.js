/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

jest.mock('../../sequelize-config', () => {
  process.env.NODE_ENV = 'test';
  return {
    [process.env.NODE_ENV]: {
      username: null,
      password: null,
      database: 'db',
      dialect: 'sqlite',
      logging: false,
    },
  };
});

beforeEach(async () => {
  const {sequelize} = jest.requireActual('../');
  // running sync instead of migrations because of weird foreign key issues
  await sequelize.sync({force: true});
});

const realModels = jest.requireActual('../');
module.exports = realModels;
