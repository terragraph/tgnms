/**
 * Copyright (c) 2014-present, Facebook, Inc.
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
