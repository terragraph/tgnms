/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

export default function(sequelize, DataTypes) {
  const NetworkTestLinkResults = sequelize.define(
    'api_singlehoptest',
    {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      status: {
        type: DataTypes.INTEGER,
      },
      origin_node: {
        type: DataTypes.INTEGER,
      },
      peer_node: {
        type: DataTypes.INTEGER,
      },
      link_name: {
        type: DataTypes.STRING,
      },
      start_time: {
        type: DataTypes.DATE,
      },
      end_time: {
        type: DataTypes.DATE,
      },
      pathloss_avg: {
        type: DataTypes.FLOAT,
      },
      foliage_factor: {
        type: DataTypes.FLOAT,
      },
      health: {
        type: DataTypes.INTEGER,
        //values: ['excellent', 'healthy', 'warning', 'marginal'],
      },
      early_weak_factor: {
        type: DataTypes.FLOAT,
      },
      mcs_p90: {
        type: DataTypes.INTEGER,
      },
      mcs_avg: {
        type: DataTypes.FLOAT,
      },
      rssi_avg: {
        type: DataTypes.FLOAT,
      },
      rssi_std: {
        type: DataTypes.FLOAT,
      },
      snr_avg: {
        type: DataTypes.FLOAT,
      },
      snr_std: {
        type: DataTypes.FLOAT,
      },
      txpwr_avg: {
        type: DataTypes.FLOAT,
      },
      txpwr_std: {
        type: DataTypes.FLOAT,
      },
      num_tx_packets: {
        type: DataTypes.INTEGER,
      },
      num_rx_packets: {
        type: DataTypes.INTEGER,
      },
      tx_per: {
        type: DataTypes.FLOAT,
      },
      rx_per: {
        type: DataTypes.FLOAT,
      },
      tx_ba: {
        type: DataTypes.INTEGER,
      },
      rx_ba: {
        type: DataTypes.INTEGER,
      },
      tx_ppdu: {
        type: DataTypes.INTEGER,
      },
      rx_ppdu: {
        type: DataTypes.INTEGER,
      },
      rx_plcp_fail: {
        type: DataTypes.INTEGER,
      },
      rx_beam_idx: {
        type: DataTypes.INTEGER,
      },
      rx_rtcal_top_panel_beam: {
        type: DataTypes.INTEGER,
      },
      rx_rtcal_bot_panel_beam: {
        type: DataTypes.INTEGER,
      },
      rx_vbs_beam: {
        type: DataTypes.INTEGER,
      },
      rx_cbf_beam: {
        type: DataTypes.INTEGER,
      },
      tx_beam_idx: {
        type: DataTypes.INTEGER,
      },
      tx_rtcal_top_panel_beam: {
        type: DataTypes.INTEGER,
      },
      tx_rtcal_bot_panel_beam: {
        type: DataTypes.INTEGER,
      },
      tx_vbs_beam: {
        type: DataTypes.INTEGER,
      },
      tx_cbf_beam: {
        type: DataTypes.INTEGER,
      },
      link_up_time: {
        type: DataTypes.INTEGER,
      },
      link_available_time: {
        type: DataTypes.INTEGER,
      },
      num_link_up_flaps: {
        type: DataTypes.INTEGER,
      },
      num_link_avail_flaps: {
        type: DataTypes.INTEGER,
      },
      p2mp_flag: {
        type: DataTypes.INTEGER(1),
      },
      ping_avg_latency: {
        type: DataTypes.FLOAT,
      },
      ping_loss: {
        type: DataTypes.INTEGER,
      },
      ping_max_latency: {
        type: DataTypes.FLOAT,
      },
      ping_min_latency: {
        type: DataTypes.FLOAT,
      },
      ping_pkt_rx: {
        type: DataTypes.INTEGER,
      },
      ping_pkt_tx: {
        type: DataTypes.INTEGER,
      },
      iperf_throughput_min: {
        type: DataTypes.FLOAT,
      },
      iperf_throughput_max: {
        type: DataTypes.FLOAT,
      },
      iperf_throughput_mean: {
        type: DataTypes.FLOAT,
      },
      iperf_throughput_std: {
        type: DataTypes.FLOAT,
      },
      iperf_link_error_min: {
        type: DataTypes.FLOAT,
      },
      iperf_link_error_max: {
        type: DataTypes.FLOAT,
      },
      iperf_link_error_mean: {
        type: DataTypes.FLOAT,
      },
      iperf_link_error_std: {
        type: DataTypes.FLOAT,
      },
      iperf_jitter_min: {
        type: DataTypes.FLOAT,
      },
      iperf_jitter_max: {
        type: DataTypes.FLOAT,
      },
      iperf_jitter_mean: {
        type: DataTypes.FLOAT,
      },
      iperf_jitter_std: {
        type: DataTypes.FLOAT,
      },
      iperf_lost_datagram_min: {
        type: DataTypes.FLOAT,
      },
      iperf_lost_datagram_max: {
        type: DataTypes.FLOAT,
      },
      iperf_lost_datagram_mean: {
        type: DataTypes.FLOAT,
      },
      iperf_lost_datagram_std: {
        type: DataTypes.FLOAT,
      },
      iperf_udp_flag: {
        type: DataTypes.INTEGER(1),
      },
      iperf_p90_tput: {
        type: DataTypes.FLOAT,
      },
      test_run_execution_id: {
        type: DataTypes.INTEGER,
      },
    },
    {
      freezeTableName: true,
      timestamps: false,
    },
  );

  return NetworkTestLinkResults;
}
