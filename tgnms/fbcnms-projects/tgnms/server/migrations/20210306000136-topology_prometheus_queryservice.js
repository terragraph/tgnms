'use strict';
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import type {DataTypes as DataTypesType, QueryInterface} from 'sequelize';
module.exports = {
  up: async (queryInterface: QueryInterface, DataTypes: DataTypesType) => {
    await queryInterface.addColumn('topology', 'prometheus_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
    await queryInterface.addColumn('topology', 'queryservice_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
    await queryInterface.addColumn('topology', 'alertmanager_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
    await queryInterface.addColumn('topology', 'alertmanager_config_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
    await queryInterface.addColumn('topology', 'prometheus_config_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
    await queryInterface.addColumn('topology', 'event_alarm_url', {
      allowNull: true,
      type: DataTypes.STRING,
    });
  },

  down: (_queryInterface: QueryInterface, _DataTypes: DataTypesType) => {
    return Promise.reject();
  },
};
