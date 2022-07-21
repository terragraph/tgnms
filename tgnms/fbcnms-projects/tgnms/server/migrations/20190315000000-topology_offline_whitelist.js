/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
