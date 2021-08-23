/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {Model} from 'sequelize';
import type Sequelize, {DataTypes as DataTypesType} from 'sequelize';
import type {NetworkPlanAttributes} from './networkPlan';

export type NetworkPlanFolderAttributes = {|
  id: number,
  fbid: string,
  name: string,
  plans: ?Array<NetworkPlanAttributes>,
|};
export type NetworkPlanFolder = NetworkPlanFolderAttributes &
  Model<NetworkPlanFolderAttributes>;

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const NetworkPlanFolder = sequelize.define(
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
  NetworkPlanFolder.associate = function ({network_plan, network_plan_folder}) {
    network_plan_folder.hasMany(network_plan, {
      foreignKey: 'folder_id',
      as: 'plans',
    });
  };

  return NetworkPlanFolder;
}
