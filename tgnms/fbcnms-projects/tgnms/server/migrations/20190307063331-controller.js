/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('controller', 'e2e_ip', {
        allowNull: true,
        type: Sequelize.STRING,
      }),
      queryInterface.renameColumn('controller', 'ip', 'api_ip'),
    ]);
  },

  down: (queryInterface, _Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('controller', 'e2e_ip'),
      queryInterface.renameColumn('controller', 'api_ip', 'ip'),
    ]);
  },
};
