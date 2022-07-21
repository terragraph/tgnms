/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable('link_metric', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      key_name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      key_prefix: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      description: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    });
  },

  down: (_queryInterface, _Sequelize) => {},
};
