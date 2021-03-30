/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {Model} from 'sequelize';
import type Sequelize, {DataTypes as DataTypesType} from 'sequelize';
import type {Controller} from './controller';
import type {MapProfile} from './mapProfile';
import type {SiteType} from '../../shared/types/Topology';
import type {WirelessController} from './wirelessController';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
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
      map_profile_id: {
        allowNull: true,
        type: DataTypes.INTEGER,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
    },
  );

  Topology.associate = function (models) {
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
    models.topology.belongsTo(models.map_profile, {
      foreignKey: 'map_profile_id',
      as: 'map_profile',
    });
  };
  return Topology;
}

export type TopologyAttributes = {|
  id: number,
  name: string,
  primary_controller: number,
  backup_controller: ?number,
  site_overrides: Array<SiteType>,
  wireless_controller: ?number,
  offline_whitelist: ?{
    links: {[string]: boolean},
    nodes: {[string]: boolean},
  },
  map_profile_id: ?number,
  //associations
  primary: Controller,
  backup: Controller,
  wac: WirelessController,
  map_profile: MapProfile,
|};

export type Topology = TopologyAttributes & Model<TopologyAttributes>;
