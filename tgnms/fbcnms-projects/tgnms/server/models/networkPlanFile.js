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
import type {FileRoles} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  FileSourceKey,
  FileStateKey,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export type NetworkPlanFileAttributes = {|
  id: number,
  role: FileRoles,
  name: string,
  state: FileStateKey,
  source: FileSourceKey,
  fbid?: ?string,
|};

export type NetworkPlanFile = NetworkPlanFileAttributes &
  Model<NetworkPlanFileAttributes>;

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const NetworkPlanFile = sequelize.define(
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
      //TODO: source and state are redundant
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
      freezeTableName: true,
      timestamps: false,
    },
  );
  NetworkPlanFile.associate = function (_models) {};
  return NetworkPlanFile;
}
