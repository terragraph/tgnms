/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface.createTable(
      'map_annotation_group',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        topology_id: {
          allowNull: false,
          type: DataTypes.INTEGER,
        },
        name: {
          allowNull: false,
          type: DataTypes.STRING,
        },
        geojson: {
          allowNull: false,
          type: DataTypes.JSON,
        },
      },
      {
        indexes: [
          {
            unique: true,
            fields: ['name', 'topology_id'],
          },
        ],
      },
    );
  },

  down: (_queryInterface, _sequelize) => {},
};
