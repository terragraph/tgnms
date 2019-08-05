/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

/**
 * This should be called once in the top level scope of each test file which
 * uses the database.
 *
 * Replaces the default sequelize config with a sqlite based version
 * for unit tests. Import the models you'll be using for your test from here.
 * (Not directly from the models folder)
 *
 * @returns the model files
 * @example:
 * const {myTable} = mockDatabase();
 * test('test the table', async () => {
 *   await myTable.bulkCreate(...);
 *   expect(...)
 * });
 */

export function mockDatabase() {
  jest.mock('../sequelize-config', () => {
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
    const {sequelize} = require('../models');
    // running sync instead of migrations because of weird foreign key issues
    await sequelize.sync({force: true});
  });
  return require('../models');
}
