

module.exports = {
  up: (queryInterface, _Sequelize) => {
    return queryInterface.bulkInsert('link_metric', [{
      name: 'la_tpc_no_traffic',
      key_name: 'latpcStats.noTrafficCountSF',
      key_prefix: 'tgf',
      description: 'LA TPC no traffic counter',
    },{
      name: 'mgmttx_bftrainingreq',
      key_name: 'mgmtTx.bfTrainingReq',
      key_prefix: 'tgf',
      description: 'Counter for BF Training Req slots at Tx',
    },{
      name: 'mgmtrx_bftrainingreq',
      key_name: 'mgmtRx.bfTrainingReq',
      key_prefix: 'tgf',
      description: 'Counter for BF Training Req slots at Rx',
    }]);
  },

  down: (_queryInterface, _Sequelize) => {
  },
};
