/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import _ from 'lodash';

export default function(sequelize, DataTypes) {
  const Topology = sequelize.define(
    'topologies',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      initial_latitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0,
      },
      initial_longitude: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0,
      },
      initial_zoom_level: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        defaultValue: 0,
      },
      e2e_ip: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      e2e_port: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      api_ip: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      api_port: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: false,
      freezeTableName: true,
    },
  );

  return Topology;
}
