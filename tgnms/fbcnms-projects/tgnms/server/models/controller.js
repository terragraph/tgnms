/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const Controller = sequelize.define(
    'controller',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      api_ip: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      e2e_ip: {
        allowNull: true,
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
  );

  Controller.associate = function (models) {
    // associations can be defined here
    models.controller.hasOne(models.topology, {
      foreignKey: 'primary_controller',
      targetKey: 'primary_controller',
    });
    models.controller.hasOne(models.topology, {
      foreignKey: 'backup_controller',
      targetKey: 'backup_controller',
    });
  };
  return Controller;
}

export type ControllerAttributes = {|
  id: number,
  api_ip: string,
  e2e_ip: string,
  e2e_port: number,
  api_port: number,
|};

export type Controller = ControllerAttributes & Model<ControllerAttributes>;
