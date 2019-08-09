/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('topology', 'offline_whitelist', {
        allowNull: true,
        type: Sequelize.JSON,
      }),
    ]);
  },

  down: (queryInterface: QueryInterface, _Sequelize: SequelizeType) => {
    return Promise.all([
      queryInterface.removeColumn('topology', 'offline_whitelist'),
    ]);
  },
};
