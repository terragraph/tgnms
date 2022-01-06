/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
