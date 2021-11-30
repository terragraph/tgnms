/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: async (queryInterface, DataTypes) => {
    return Promise.all([
      queryInterface.createTable(
        'controller',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          ip: {
            allowNull: false,
            type: DataTypes.STRING,
          },
          e2e_port: {
            allowNull: false,
            type: DataTypes.INTEGER,
          },
          api_port: {
            allowNull: false,
            type: DataTypes.INTEGER,
          },
        },
        {
          freezeTableName: true,
          timestamps: false,
        },
      ),
      queryInterface.createTable(
        'topology',
        {
          id: {
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
          },
          name: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
          },
          primary_controller: {
            allowNull: false,
            type: DataTypes.INTEGER,
          },
          backup_controller: {
            allowNull: true,
            type: DataTypes.INTEGER,
          },
          site_overrides: {
            allowNull: true,
            type: DataTypes.JSON,
          },
        },
        {
          freezeTableName: true,
          timestamps: false,
        },
      ),
      queryInterface.createTable(
        'wireless_controller',
        {
          id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          type: {
            allowNull: false,
            type: DataTypes.ENUM('ruckus'),
          },
          url: {
            allowNull: false,
            type: DataTypes.STRING,
          },
          username: {
            allowNull: false,
            type: DataTypes.STRING,
          },
          password: {
            allowNull: false,
            type: DataTypes.STRING,
          },
        },
        {
          freezeTableName: true,
          timestamps: false,
        },
      ),
      queryInterface.createTable(
        'link_event',
        {
          id: {
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
          },
          topologyName: {
            type: DataTypes.STRING(100),
          },
          linkName: {
            type: DataTypes.STRING(100),
          },
          linkDirection: {
            type: DataTypes.STRING(1),
          },
          eventType: {
            type: DataTypes.ENUM('LINK_UP', 'LINK_UP_DATADOWN'),
          },
          startTs: {
            type: DataTypes.DATE,
          },
          endTs: {
            type: DataTypes.DATE,
          },
        },
        {
          freezeTableName: true,
          timestamps: false,
        },
      ),
    ]);
  },

  down: (_queryInterface, _DataTypes) => {
    return Promise.all([]);
  },
};
