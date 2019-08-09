/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {TestExecution} from './testExecution';

import type Sequelize, {DataTypes as DataTypesType, Model} from 'sequelize';

type TestResultAttributes = {|
  id: number,
  status: number,
  origin_node: string,
  peer_node: string,
  link_name: string,
  start_date_utc: Date,
  end_date_utc: Date,
  pathloss_avg: number,
  foliage_factor: number,
  health: number,
  early_weak_factor: number,
  mcs_p90: number,
  mcs_avg: number,
  rssi_avg: number,
  rssi_std: number,
  snr_avg: number,
  snr_std: number,
  txpwr_avg: number,
  txpwr_std: number,
  num_tx_packets: number,
  num_rx_packets: number,
  tx_per: number,
  rx_per: number,
  tx_ba: number,
  rx_ba: number,
  tx_ppdu: number,
  rx_ppdu: number,
  rx_plcp_fail: number,
  rx_beam_idx: number,
  rx_rtcal_top_panel_beam: number,
  rx_rtcal_bot_panel_beam: number,
  rx_vbs_beam: number,
  rx_cbf_beam: number,
  tx_beam_idx: number,
  tx_rtcal_top_panel_beam: number,
  tx_rtcal_bot_panel_beam: number,
  tx_vbs_beam: number,
  tx_cbf_beam: number,
  link_up_time: number,
  link_available_time: number,
  num_link_up_flaps: number,
  num_link_avail_flaps: number,
  p2mp_flag: number,
  ping_avg_latency: number,
  ping_loss: number,
  ping_max_latency: number,
  ping_min_latency: number,
  ping_pkt_rx: number,
  ping_pkt_tx: number,
  iperf_throughput_min: number,
  iperf_throughput_max: number,
  iperf_throughput_mean: number,
  iperf_throughput_std: number,
  iperf_link_error_min: number,
  iperf_link_error_max: number,
  iperf_link_error_mean: number,
  iperf_link_error_std: number,
  iperf_jitter_min: number,
  iperf_jitter_max: number,
  iperf_jitter_mean: number,
  iperf_jitter_std: number,
  iperf_lost_datagram_min: number,
  iperf_lost_datagram_max: number,
  iperf_lost_datagram_mean: number,
  iperf_lost_datagram_std: number,
  iperf_udp_flag: number,
  iperf_p90_tput: number,
  test_run_execution_id: number,
  iperf_client_blob: string,
  iperf_server_blob: string,
  ping_output_blob: string,
  iperf_pushed_throughput: number,
  is_ecmp: number,
  route_changed_count: number,
  test_execution: ?TestExecution,
|};

export type TestResult = TestResultAttributes & Model<TestResultAttributes>;

export default function(sequelize: Sequelize, DataTypes: DataTypesType) {
  const TestResult = sequelize.define(
    'api_testresult',
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
        type: DataTypes.STRING(256),
      },
      peer_node: {
        type: DataTypes.STRING(256),
      },
      link_name: {
        type: DataTypes.STRING(256),
      },
      start_date_utc: {
        type: DataTypes.DATE,
      },
      end_date_utc: {
        type: DataTypes.DATE,
      },
      pathloss_avg: {
        type: DataTypes.DOUBLE,
      },
      foliage_factor: {
        type: DataTypes.DOUBLE,
      },
      health: {
        type: DataTypes.INTEGER,
      },
      early_weak_factor: {
        type: DataTypes.DOUBLE,
      },
      mcs_p90: {
        type: DataTypes.INTEGER,
      },
      mcs_avg: {
        type: DataTypes.DOUBLE,
      },
      rssi_avg: {
        type: DataTypes.DOUBLE,
      },
      rssi_std: {
        type: DataTypes.DOUBLE,
      },
      snr_avg: {
        type: DataTypes.DOUBLE,
      },
      snr_std: {
        type: DataTypes.DOUBLE,
      },
      txpwr_avg: {
        type: DataTypes.DOUBLE,
      },
      txpwr_std: {
        type: DataTypes.DOUBLE,
      },
      num_tx_packets: {
        type: DataTypes.INTEGER,
      },
      num_rx_packets: {
        type: DataTypes.INTEGER,
      },
      tx_per: {
        type: DataTypes.DOUBLE,
      },
      rx_per: {
        type: DataTypes.DOUBLE,
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
        type: DataTypes.DOUBLE,
      },
      ping_loss: {
        type: DataTypes.INTEGER,
      },
      ping_max_latency: {
        type: DataTypes.DOUBLE,
      },
      ping_min_latency: {
        type: DataTypes.DOUBLE,
      },
      ping_pkt_rx: {
        type: DataTypes.INTEGER,
      },
      ping_pkt_tx: {
        type: DataTypes.INTEGER,
      },
      iperf_throughput_min: {
        type: DataTypes.DOUBLE,
      },
      iperf_throughput_max: {
        type: DataTypes.DOUBLE,
      },
      iperf_throughput_mean: {
        type: DataTypes.DOUBLE,
      },
      iperf_throughput_std: {
        type: DataTypes.DOUBLE,
      },
      iperf_link_error_min: {
        type: DataTypes.DOUBLE,
      },
      iperf_link_error_max: {
        type: DataTypes.DOUBLE,
      },
      iperf_link_error_mean: {
        type: DataTypes.DOUBLE,
      },
      iperf_link_error_std: {
        type: DataTypes.DOUBLE,
      },
      iperf_jitter_min: {
        type: DataTypes.DOUBLE,
      },
      iperf_jitter_max: {
        type: DataTypes.DOUBLE,
      },
      iperf_jitter_mean: {
        type: DataTypes.DOUBLE,
      },
      iperf_jitter_std: {
        type: DataTypes.DOUBLE,
      },
      iperf_lost_datagram_min: {
        type: DataTypes.DOUBLE,
      },
      iperf_lost_datagram_max: {
        type: DataTypes.DOUBLE,
      },
      iperf_lost_datagram_mean: {
        type: DataTypes.DOUBLE,
      },
      iperf_lost_datagram_std: {
        type: DataTypes.DOUBLE,
      },
      iperf_udp_flag: {
        type: DataTypes.INTEGER(1),
      },
      iperf_p90_tput: {
        type: DataTypes.DOUBLE,
      },
      test_run_execution_id: {
        type: DataTypes.INTEGER,
      },
      iperf_client_blob: {
        type: DataTypes.TEXT,
      },
      iperf_server_blob: {
        type: DataTypes.TEXT,
      },
      ping_output_blob: {
        type: DataTypes.TEXT,
      },
      iperf_pushed_throughput: {
        type: DataTypes.DOUBLE,
      },
      is_ecmp: {
        type: DataTypes.INTEGER(1),
      },
      route_changed_count: {
        type: DataTypes.INTEGER,
      },
    },
    {
      /**
       * this table is managed by network test, so nms should not create or
       * migrate it.
       */
      doNotCreateTable: true,
      freezeTableName: true,
      timestamps: false,
    },
  );

  TestResult.associate = function(models) {
    models.api_testresult.belongsTo(models.api_testrunexecution, {
      as: 'test_execution',
      foreignKey: 'test_run_execution_id',
    });
  };

  return TestResult;
}
