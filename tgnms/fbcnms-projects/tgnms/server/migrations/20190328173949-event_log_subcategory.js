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
