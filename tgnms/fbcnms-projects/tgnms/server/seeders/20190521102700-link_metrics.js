/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  up: (queryInterface, _Sequelize) => {
    return queryInterface.bulkInsert('link_metric', [
      {
        name: 'link_health',
        key_name: 'health',
        key_prefix: 'link',
        description: 'Link Health Periodic Monitoring',
      },
    ]);
  },

  down: (_queryInterface, _Sequelize) => {},
};
