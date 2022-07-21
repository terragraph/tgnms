/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

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
