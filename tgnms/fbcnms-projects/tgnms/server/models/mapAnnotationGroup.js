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
