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
