/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
