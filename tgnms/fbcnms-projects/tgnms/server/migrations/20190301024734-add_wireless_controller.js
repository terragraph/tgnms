/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('topology', 'wireless_controller', {
      allowNull: true,
      type: Sequelize.INTEGER,
    });
  },

  down: (_queryInterface, _Sequelize) => {
    return;
  },
};
