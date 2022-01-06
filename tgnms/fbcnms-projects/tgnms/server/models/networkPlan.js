/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import {Model} from 'sequelize';
import type Sequelize, {
  DataTypeAbstract,
  DataTypes as DataTypesType,
  DefineAttributeColumnOptions,
} from 'sequelize';
import type {NetworkPlanFileAttributes} from './networkPlanFile';
import type {NetworkPlanFolderAttributes} from './networkPlanFolder';
import type {NetworkPlanStateType} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
export type NetworkPlanAttributes = {|
  id: number,
  folder_id: number,
  fbid?: ?string,
  folder?: ?NetworkPlanFolderAttributes,
  state: NetworkPlanStateType,

  /**
   * Plan inputs that will eventually be submitted to ANP
   */
  // parameters
  name: string,
  // input files
  dsm_file_id?: ?number,
  dsm_file?: ?NetworkPlanFileAttributes,
  boundary_file_id?: ?number,
  boundary_file?: ?NetworkPlanFileAttributes,
  sites_file_id?: ?number,
  sites_file?: ?NetworkPlanFileAttributes,
  /**
   * List of potential hardware models to consider during planning. This
   * drives the mesh-planner's multi-sku feature. When launching the plan,
   * these hardware profiles will be converted into the "device_list_file"
   * expected by the mesh-planner api. The device_list_file
   * expects a list of SectorParams. These are typed in
   * MeshPlannerSectorParams in shared/dto/ANP.js. If this list is null/empty,
   * assume that all profiles can be used.
   */
  hardware_board_ids: ?Array<string>,
|};
export type NetworkPlan = NetworkPlanAttributes & Model<NetworkPlanAttributes>;

export function getInputFileFields(): Array<{
  foreignKey: $Keys<NetworkPlanAttributes>,
  as: $Keys<NetworkPlanAttributes>,
}> {
  return [
    {
      foreignKey: 'dsm_file_id',
      as: 'dsm_file',
    },
    {
      foreignKey: 'boundary_file_id',
      as: 'boundary_file',
    },
    {
      foreignKey: 'sites_file_id',
      as: 'sites_file',
    },
  ];
}

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const attributes: {
    [$Keys<NetworkPlanAttributes>]:
      | string
      | $Shape<DefineAttributeColumnOptions>
      | DataTypeAbstract,
  } = {
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
    hardware_board_ids: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  };
  const inputFileFields = getInputFileFields();
  for (const column of inputFileFields) {
    attributes[column.foreignKey] = ({
      type: DataTypes.INTEGER,
      allowNull: true,
    }: $Shape<DefineAttributeColumnOptions>);
  }
  const NetworkPlan = sequelize.define('network_plan', attributes, {
    indexes: [
      {
        unique: true,
        fields: ['name', 'folder_id'],
      },
    ],
    freezeTableName: true,
    timestamps: false,
  });
  NetworkPlan.associate = function ({
    network_plan,
    network_plan_file,
    network_plan_folder,
  }) {
    for (const field of getInputFileFields()) {
      network_plan.belongsTo(network_plan_file, field);
    }
    network_plan.belongsTo(network_plan_folder, {
      foreignKey: 'folder_id',
      as: 'folder',
    });
  };

  return NetworkPlan;
}
