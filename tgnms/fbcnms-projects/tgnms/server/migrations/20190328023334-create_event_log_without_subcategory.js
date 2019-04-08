/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface
      .createTable('event_log', {
        id: {
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        mac: {
          type: DataTypes.STRING(100),
        },
        name: {
          type: DataTypes.STRING(100),
        },
        topologyName: {
          type: DataTypes.STRING(100),
        },
        source: {
          type: DataTypes.STRING(100),
        },
        timestamp: {
          type: DataTypes.INTEGER,
        },
        reason: {
          type: DataTypes.TEXT,
        },
        details: {
          type: DataTypes.TEXT,
        },
        category: {
          type: DataTypes.STRING(100),
        },
        level: {
          type: DataTypes.STRING(100),
        },
      })
      .then(() => {
        return Promise.all([
          queryInterface.addIndex('event_log', ['mac'], {
            indexName: 'mac',
          }),
          queryInterface.addIndex('event_log', ['name'], {
            indexName: 'name',
          }),
          queryInterface.addIndex('event_log', ['topologyName'], {
            indexName: 'topologyName',
          }),
          queryInterface.addIndex('event_log', ['source'], {
            indexName: 'source',
          }),
          queryInterface.addIndex('event_log', ['timestamp'], {
            indexName: 'timestamp',
          }),
          queryInterface.addIndex('event_log', ['category'], {
            indexName: 'category',
          }),
          queryInterface.addIndex('event_log', ['level'], {
            indexName: 'level',
          }),
        ]);
      });
  },

  down: (_queryInterface, _Sequelize) => {},
};
