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
  const LinkMetric = sequelize.define(
    'link_metric',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      key_name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      key_prefix: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      name: {
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      description: {
        allowNull: false,
        type: DataTypes.STRING,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
    },
  );

  return LinkMetric;
}

export type LinkMetricAttributes = {|
  id: number,
  key_name: string,
  key_prefix: string,
  name: string,
  description: string,
|};

export type LinkMetric = LinkMetricAttributes & Model<LinkMetricAttributes>;
