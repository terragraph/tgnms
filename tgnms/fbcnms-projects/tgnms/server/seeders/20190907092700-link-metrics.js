/**
 * Copyright (c) 2014-present, Facebook, Inc.
 */
module.exports = {
  up: (queryInterface, _Sequelize) => {
    return queryInterface.bulkInsert('link_metric', [
      {
        name: 'mgmtrx_bftrainingrsp',
        key_name: 'mgmtRx.bfTrainingRsp',
        key_prefix: 'tgf',
        description: 'Counter for BF Training Rsp slots at Rx',
      },
    ]);
  },

  down: (_queryInterface, _Sequelize) => {},
};
