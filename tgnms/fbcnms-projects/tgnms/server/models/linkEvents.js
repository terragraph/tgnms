/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */
'use strict';

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

export default function (sequelize: Sequelize, DataTypes: DataTypesType) {
  const LinkEvent = sequelize.define(
    'link_event',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      topologyName: {
        type: DataTypes.STRING(100),
      },
      linkName: {
        type: DataTypes.STRING(100),
      },
      linkDirection: {
        type: DataTypes.STRING(1),
      },
      eventType: {
        type: DataTypes.ENUM('LINK_UP', 'LINK_UP_DATADOWN'),
      },
      startTs: {
        type: DataTypes.DATE,
      },
      endTs: {
        type: DataTypes.DATE,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
    },
  );
  return LinkEvent;
}

export type LinkEventAttributes = {|
  id: number,
  linkName: string,
  linkDirection: string,
  eventType: string,
  startTs: number,
  endTs: number,
  topologyName: string,
|};

export type LinkEvent = LinkEventAttributes & Model<LinkEventAttributes>;
