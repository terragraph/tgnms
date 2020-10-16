/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

module.exports = {
  up: async (queryInterface, DataTypes) => {
    return Promise.all([
      queryInterface.createTable('DockerHosts', {
        id: {
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        createdAt: {
          allowNull: false,
          defaultValue: DataTypes.NOW(),
          type: DataTypes.DATE,
        },
        host: {
          allowNull: false,
          type: DataTypes.STRING,
          validate: {
            isIP: true,
          },
        },
        name: {
          allowNull: false,
          type: DataTypes.STRING,
          unique: true,
        },
        port: {
          type: DataTypes.INTEGER,
          validate: {
            isInt: true,
          },
        },
        updatedAt: {
          allowNull: false,
          defaultValue: DataTypes.NOW(),
          type: DataTypes.DATE,
        },
      }),
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
    ]).then(() =>
      Promise.all([
        queryInterface.addConstraint('topology', ['primary_controller'], {
          type: 'foreign key',
          name: 'topology_primary_controller',
          references: {
            table: 'controller',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        }),
        queryInterface.addConstraint('topology', ['backup_controller'], {
          type: 'foreign key',
          name: 'topology_backup_controller',
          references: {
            table: 'controller',
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        }),
      ]),
    );
  },

  down: (_queryInterface, _DataTypes) => {
    return Promise.all([]);
  },
};
