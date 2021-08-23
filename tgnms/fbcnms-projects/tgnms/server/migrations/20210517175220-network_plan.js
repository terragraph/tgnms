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
    await queryInterface.createTable(
      'network_plan_folder',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        fbid: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        indexes: [
          {
            unique: true,
            fields: ['fbid'],
          },
        ],
        freezeTableName: true,
        timestamps: false,
      },
    );
    await queryInterface.createTable(
      'network_plan',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        folder_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        state: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        fbid: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        dsm_file_id: {type: DataTypes.INTEGER, allowNull: true},
        boundary_file_id: {type: DataTypes.INTEGER, allowNull: true},
        sites_file_id: {type: DataTypes.INTEGER, allowNull: true},
      },
      {
        indexes: [
          {
            unique: true,
            fields: ['name', 'folder_id'],
          },
        ],
        freezeTableName: true,
        timestamps: false,
      },
    );
    await queryInterface.createTable(
      'network_plan_file',
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
        fbid: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        state: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        source: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        indexes: [],
        freezeTableName: true,
        timestamps: false,
      },
    );
  },

  down: (_queryInterface: QueryInterface, _sequelize: Sequelize) => {},
};
