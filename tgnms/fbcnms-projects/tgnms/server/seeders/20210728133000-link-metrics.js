/**
 * Copyright (c) 2014-present, Facebook, Inc.
 */
module.exports = {
  up: (queryInterface, _Sequelize) => {
    return queryInterface.bulkInsert('link_metric', [
      {
        name: 'tx_codebook_beam_idx',
        key_name: 'bfScanStats.txScanBeams.codebookBeam',
        key_prefix: 'tgf',
        description: 'Transmit Codebook Beam Index',
      },
      {
        name: 'rx_codebook_beam_idx',
        key_name: 'bfScanStats.rxScanBeams.codebookBeam',
        key_prefix: 'tgf',
        description: 'Receive Codebook Beam Index',
      },
      {
        name: 'num_scan_req_recvd',
        key_name: 'bfScanStats.numOfScanReqRecvd',
        key_prefix: 'tgf',
        description: 'Number of scan request commands received',
      },
      {
        name: 'num_scan_complete',
        key_name: 'bfScanStats.numOfScanCompleted',
        key_prefix: 'tgf',
        description: 'Number of scans complete',
      },
      {
        name: 'num_scan_dropped',
        key_name: 'bfScanStats.numOfScanDropped',
        key_prefix: 'tgf',
        description: 'Number of scans dropped',
      },
      {
        name: 'num_scan_aborted',
        key_name: 'bfScanStats.numOfScanAborted',
        key_prefix: 'tgf',
        description: 'Number of scans aborted',
      },
      {
        name: 'num_scan_as_initiator',
        key_name: 'bfScanStats.numOfScanAsInitiator',
        key_prefix: 'tgf',
        description: 'Number of scans as initiator',
      },
      {
        name: 'num_scan_as_responder',
        key_name: 'bfScanStats.numOfScanAsResponder',
        key_prefix: 'tgf',
        description: 'Number of scans as Responder',
      },
      {
        name: 'num_pbf_scan',
        key_name: 'bfScanStats.numOfPbfScan',
        key_prefix: 'tgf',
        description: 'Number of PBF scans',
      },
      {
        name: 'num_im_scan',
        key_name: 'bfScanStats.numOfImScan',
        key_prefix: 'tgf',
        description: 'Number of IM scans',
      },
      {
        name: 'num_rtcal_scan',
        key_name: 'bfScanStats.numOfRtCalScan',
        key_prefix: 'tgf',
        description: 'Number of RTCAL scans',
      },
      {
        name: 'num_vbs_scan',
        key_name: 'bfScanStats.numOfVbsScan',
        key_prefix: 'tgf',
        description: 'Number of VBS scans',
      },
      {
        name: 'num_cbf_scan',
        key_name: 'bfScanStats.numOfCbfScan',
        key_prefix: 'tgf',
        description: 'Number of CBF scans',
      },
    ]);
  },

  down: (_queryInterface, _Sequelize) => {},
};
