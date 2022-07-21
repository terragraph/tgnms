/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
'use strict';
import type Sequelize, {
  DataTypes as DataTypesType,
  QueryInterface,
} from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface, DataTypes: DataTypesType) => {
    await queryInterface.addColumn('network_plan', 'hardware_board_ids', {
      allowNull: true,
      type: DataTypes.JSON,
    });
  },

  down: (_queryInterface: QueryInterface, _sequelize: Sequelize) => {},
};
