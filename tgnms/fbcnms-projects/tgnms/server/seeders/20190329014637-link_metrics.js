

module.exports = {
  up: (queryInterface, _Sequelize) => {
    return queryInterface.bulkInsert('link_metric', [{
      name: 'rssi',
      key_name: 'phystatus.srssi',
      key_prefix: 'tgf',
      description: 'Received Signal Strength Indicator',
    },{
      name: 'data_rssi',
      key_name: 'phystatusdata.srssi',
      key_prefix: 'tgf',
      description: 'RSSI measured on data packets',
    },{
      name: 'snr',
      key_name: 'phystatus.ssnrEst',
      key_prefix: 'tgf',
      description: 'Signal to Noise Ratio',
    },{
      name: 'evm',
      key_name: 'phystatus.spostSNRdB',
      key_prefix: 'tgf',
      description: 'EVM (post SNR)',
    },{
      name: 'mcs',
      key_name: 'staPkt.mcs',
      key_prefix: 'tgf',
      description: 'MCS Index',
    },{
      name: 'per',
      key_name: 'staPkt.perE6',
      key_prefix: 'tgf',
      description: 'Tx Packet Error Rate',
    },{
      name: 'rxper',
      key_name: 'staPkt.rxPerE6',
      key_prefix: 'tgf',
      description: 'Rx Packet Error Rate',
    },{
      name: 'fw_uptime',
      key_name: 'staPkt.mgmtLinkUp',
      key_prefix: 'tgf',
      description: 'Mgmt Link Up Count',
    },{
      name: 'tx_ppdu',
      key_name: 'staPkt.txPpdu',
      key_prefix: 'tgf',
      description: 'Transmit PPDU Count',
    },{
      name: 'rx_ppdu',
      key_name: 'staPkt.rxPpdu',
      key_prefix: 'tgf',
      description: 'Received PPDU Count',
    },{
      name: 'tx_ba',
      key_name: 'staPkt.txBa',
      key_prefix: 'tgf',
      description: 'Transmit Block Ack Count',
    },{
      name: 'rx_ba',
      key_name: 'staPkt.rxBa',
      key_prefix: 'tgf',
      description: 'Receiver Block Ack Count',
    },{
      name: 'link_avail',
      key_name: 'staPkt.linkAvailable',
      key_prefix: 'tgf',
      description: 'Mgmt Link Available Count',
    },{
      name: 'tx_ok',
      key_name: 'staPkt.txOk',
      key_prefix: 'tgf',
      description: 'Successful TX MPDUs',
    },{

      name: 'rx_ok',
      key_name: 'staPkt.rxOk',
      key_prefix: 'tgf',
      description: 'Successful TX MPDUs',
    },{
      name: 'tx_fail',
      key_name: 'staPkt.txFail',
      key_prefix: 'tgf',
      description: 'Failed TX MPDUs',
    },{
      name: 'rx_fail',
      key_name: 'staPkt.rxFail',
      key_prefix: 'tgf',
      description: 'Failed RX MDPUs',
    },{
      name: 'tx_bytes',
      key_name: 'tx_bytes',
      key_prefix: 'link',
      description: 'Transferred bits/second',
    },{
      name: 'rx_bytes',
      key_name: 'rx_bytes',
      key_prefix: 'link',
      description: 'Received bits/second',
    },{
      name: 'tx_errors',
      key_name: 'tx_errors',
      key_prefix: 'link',
      description: 'Transmit errors/second',
    },{
      name: 'rx_errors',
      key_name: 'rx_errors',
      key_prefix: 'link',
      description: 'Receive errors/second',
    },{
      name: 'tx_dropped',
      key_name: 'tx_dropped',
      key_prefix: 'link',
      description: 'Transmit dropped/second',
    },{
      name: 'rx_dropped',
      key_name: 'rx_dropped',
      key_prefix: 'link',
      description: 'Receive dropped/second',
    },{
      name: 'tx_pps',
      key_name: 'tx_packets',
      key_prefix: 'link',
      description: 'Transmit packets/second',
    },{
      name: 'rx_pps',
      key_name: 'rx_packets',
      key_prefix: 'link',
      description: 'Receive packets/second',
    },{
      name: 'tx_power',
      key_name: 'staPkt.txPowerIndex',
      key_prefix: 'tgf',
      description: 'Transmit Power',
    },{
      name: 'rx_frame',
      key_name: 'rx_frame',
      key_prefix: 'link',
      description: 'RX Frame',
    },{
      name: 'rx_overruns',
      key_name: 'rx_overruns',
      key_prefix: 'link',
      description: 'RX Overruns',
    },{
      name: 'tx_overruns',
      key_name: 'tx_overruns',
      key_prefix: 'link',
      description: 'TX Overruns',
    },{
      name: 'tx_collisions',
      key_name: 'tx_collisions',
      key_prefix: 'link',
      description: 'TX Collisions',
    },{
      name: 'speed',
      key_name: 'speed',
      key_prefix: 'link',
      description: 'Speed (mbps)',
    },{
      name: 'tx_beam_idx',
      key_name: 'phyperiodic.txbeamidx',
      key_prefix: 'tgf',
      description: 'Transmit Beam Index',
    },{
      name: 'rx_beam_idx',
      key_name: 'phyperiodic.rxbeamidx',
      key_prefix: 'tgf',
      description: 'Receive Beam Index',
    }]);
  },

  down: (_queryInterface, _Sequelize) => {
  },
};
