/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

export default function(sequelize, DataTypes) {
  const DockerHosts = sequelize.define('DockerHosts', {
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
  });

  return DockerHosts;
}
