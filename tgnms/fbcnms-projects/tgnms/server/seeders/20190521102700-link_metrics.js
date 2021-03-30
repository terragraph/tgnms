/**
 * Copyright (c) 2014-present, Facebook, Inc.
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
