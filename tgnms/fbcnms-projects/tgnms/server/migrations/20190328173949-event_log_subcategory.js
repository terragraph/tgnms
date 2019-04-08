/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

module.exports = {
  up: (queryInterface, DataTypes) => {
    return queryInterface
      .addColumn('event_log', 'subcategory', {
        type: DataTypes.STRING(100),
        allowNull: true,
      })
      .then(() => {
        return queryInterface.addIndex('event_log', ['subcategory'], {
          indexName: 'subcategory',
        });
      });
  },

  down: (_queryInterface, _Sequelize) => {},
};
