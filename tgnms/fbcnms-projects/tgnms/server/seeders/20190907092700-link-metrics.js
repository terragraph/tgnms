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
        name: 'mgmtrx_bftrainingrsp',
        key_name: 'mgmtRx.bfTrainingRsp',
        key_prefix: 'tgf',
        description: 'Counter for BF Training Rsp slots at Rx',
      },
    ]);
  },

  down: (_queryInterface, _Sequelize) => {},
};
