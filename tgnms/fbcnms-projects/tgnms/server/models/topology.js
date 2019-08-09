/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

export default function(sequelize: Sequelize, DataTypes: DataTypesType) {
  const Topology = sequelize.define(
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
      // site location overrides
      site_overrides: {
        allowNull: true,
        type: DataTypes.JSON,
      },
      wireless_controller: {
        allowNull: true,
        type: DataTypes.INTEGER,
      },
      offline_whitelist: {
        allowNull: true,
        type: DataTypes.JSON,
      },
    },
    {
      doNotCreateTable: true,
      freezeTableName: true,
      timestamps: false,
    },
  );

  Topology.associate = function(models) {
    // associations can be defined here
    models.topology.belongsTo(models.controller, {
      foreignKey: 'primary_controller',
      as: 'primary',
    });
    models.topology.belongsTo(models.controller, {
      foreignKey: 'backup_controller',
      as: 'backup',
    });
    models.topology.belongsTo(models.wireless_controller, {
      foreignKey: 'wireless_controller',
      as: 'wac',
    });
  };
  return Topology;
}

export type TopologyAttributes = {|
  id: number,
  name: string,
  primary_controller: number,
  backup_controller: ?number,
  site_overrides: ?string,
  wireless_controller: ?number,
  offline_whitelist: ?{
    links: {[string]: boolean},
    nodes: {[string]: boolean},
  },
|};

export type Topology = TopologyAttributes & Model<TopologyAttributes>;
