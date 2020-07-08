/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const WirelessController = sequelize.define(
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
  );

  WirelessController.associate = function (models) {
    // associations can be defined here
    models.wireless_controller.hasOne(models.topology, {
      foreignKey: 'wireless_controller',
      targetKey: 'wireless_controller',
    });
  };
  return WirelessController;
}

export type WirelessControllerType = 'ruckus';

export type WirelessControllerAttributes = {|
  id: number,
  type: WirelessControllerType,
  url: string,
  username: string,
  password: string,
|};

export type WirelessController = Model<WirelessControllerAttributes>;
