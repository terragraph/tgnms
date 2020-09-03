/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';
import type {TopologyAttributes} from './topology';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const MapProfile = sequelize.define(
    'map_profile',
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
      json: {
        allowNull: false,
        type: DataTypes.JSON,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['name'],
        },
      ],
      freezeTableName: true,
      timestamps: false,
    },
  );

  MapProfile.associate = function (models) {
    models.map_profile.hasMany(models.topology, {
      foreignKey: 'map_profile_id',
      as: 'networks',
    });
  };

  return MapProfile;
}

export type MapProfileAttributes = {|
  id: number,
  name: string,
  json: string,
  networks: Array<$Shape<TopologyAttributes>>,
|};

export type MapProfile = MapProfileAttributes & Model<MapProfileAttributes>;
