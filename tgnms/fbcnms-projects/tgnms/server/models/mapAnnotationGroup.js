/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';
import type {TopologyAttributes} from './topology';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const MapAnnotationGroup = sequelize.define(
    'map_annotation_group',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      topology_id: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      geojson: {
        allowNull: false,
        type: DataTypes.JSON,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['name', 'topology_id'],
        },
      ],
      freezeTableName: true,
      timestamps: false,
    },
  );

  MapAnnotationGroup.associate = function (models) {
    models.map_annotation_group.belongsTo(models.topology, {
      foreignKey: 'topology_id',
      as: 'topology',
    });
  };

  return MapAnnotationGroup;
}

export type MapAnnotationGroupAttributes = {|
  id: number,
  topology_id: number,
  name: string,
  geojson: string,
  topology?: TopologyAttributes,
|};

export type MapAnnotationGroup = MapAnnotationGroupAttributes &
  Model<MapAnnotationGroupAttributes>;
