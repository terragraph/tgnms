/**
 * Copyright (c) 2014-present, Facebook, Inc.
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
