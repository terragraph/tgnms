/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

module.exports = {
  up: (queryInterface, DataTypes) => {
    return Promise.all([
      queryInterface.removeColumn('event_log', 'subcategory'),
      queryInterface
        .addColumn('event_log', 'eventId', {
          type: DataTypes.STRING(100),
          allowNull: true,
        })
        .then(() => {
          return queryInterface.addIndex('event_log', ['eventId'], {
            indexName: 'eventId',
          });
        }),
    ]);
  },

  down: (_queryInterface, _Sequelize) => {},
};
