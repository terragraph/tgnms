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
  up: (queryInterface: QueryInterface, DataTypes: DataTypesType) => {
    return Promise.all([
      queryInterface.addColumn('topology', 'map_profile_id', {
        allowNull: true,
        type: DataTypes.INTEGER,
      }),
      queryInterface.createTable(
        'map_profile',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          name: {
            allowNull: false,
            type: DataTypes.STRING,
          },
          json: {
            allowNull: false,
            type: DataTypes.JSON,
          },
        },
        {
          indexes: [
            {
              unique: true,
              fields: ['name'],
            },
          ],
        },
      ),
    ]);
  },

  down: (_queryInterface: QueryInterface, _sequelize: Sequelize) => {},
};
