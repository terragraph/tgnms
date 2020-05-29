/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as StringHelpers from '../../helpers/StringHelpers';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import Grid from '@material-ui/core/Grid';
import HealthTextSquare from './HealthTextSquare';
import MetricGroup from './MetricGroup';
import NetworkContext from '../../contexts/NetworkContext';
import ShowAdvanced from '../../components/common/ShowAdvanced';
import Typography from '@material-ui/core/Typography';
import {HEALTH_CODES, getHealthDef} from '../../constants/HealthConstants';
import {makeStyles} from '@material-ui/styles';

import type {ExecutionResultDataType} from '../../../shared/dto/NetworkTestTypes';

const MEGABITS = Math.pow(1000, 2);

const useDetailStyles = makeStyles(theme => ({
  linkNameWrapper: {
    width: '100%',
    marginBottom: theme.spacing(),
  },
  linkName: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
    color: theme.palette.grey[600],
    overflow: 'hidden',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
  },
  linkHealth: {
    marginBottom: theme.spacing(),
    textTransform: 'capitalize',
  },
}));

export default function LinkDirectionDetails({
  result,
}: {|
  result: ExecutionResultDataType,
|}) {
  const {linkMap} = React.useContext(NetworkContext);
  const link = linkMap[result.asset_name];

  const classes = useDetailStyles();
  return (
    <>
      <Grid className={classes.linkNameWrapper} container direction="row">
        <Typography className={classes.linkName} variant="body2">
          {result.src_node_mac === link.a_node_mac
            ? link.a_node_name
            : link.z_node_name}
        </Typography>
        <Typography className={classes.linkName} variant="body2">
          <ArrowForwardIcon fontSize="small" />
        </Typography>
        <Typography className={classes.linkName} variant="body2">
          {result.dst_node_mac === link.a_node_mac
            ? link.a_node_name
            : link.z_node_name}
        </Typography>
      </Grid>

      <Grid className={classes.linkHealth} item>
        <Typography variant="subtitle2">
          <HealthTextSquare
            health={HEALTH_CODES[result.health]}
            text={getHealthDef(HEALTH_CODES[result.health]).name}
          />
        </Typography>
      </Grid>

      <MetricGroup
        header={'Summary'}
        metrics={[
          {val: result.mcs_avg || 0, label: 'MCS Avg'},
          {val: result.snr_avg || 0, label: 'SNR Avg'},
          {val: result.tx_pwr_avg || 0, label: 'Tx power'},
          {val: result.iperf_avg_lost_percent || 0, label: 'Path loss'},
          {val: convertToExp(result.tx_per || 0), label: 'PER'},
          {
            val:
              (new Date(result.end_dt).getTime() -
                new Date(result.start_dt).getTime()) /
                1000 || 0,
            label: 'Duration',
            metricUnit: 'Seconds',
          },
          {
            val: result.link_distance || 0,
            label: 'Link Distance',
            metricUnit: 'Meters',
          },
        ]}
      />
      <MetricGroup
        header="Iperf Throughput"
        groupUnits="Mbgps"
        metrics={[
          {val: result.iperf_avg_throughput || 0, label: 'Avg'},
          {val: result.iperf_min_throughput || 0, label: 'Min'},
          {val: result.iperf_max_throughput || 0, label: 'Max'},
        ]}
        format={x => StringHelpers.formatNumber(x / MEGABITS, 2)}
      />

      <ShowAdvanced
        children={
          <>
            {result.iperf_avg_lost_percent ? (
              <MetricGroup
                header="iperf lost datagram"
                groupUnits="%"
                metrics={[
                  {val: result.iperf_avg_lost_percent || 0, label: 'Avg'},
                  {val: result.iperf_min_lost_percent || 0, label: 'Min'},
                  {val: result.iperf_max_lost_percent || 0, label: 'Max'},
                ]}
              />
            ) : (
              <MetricGroup
                header="iperf retransmits"
                groupUnits="%"
                metrics={[
                  {val: result.iperf_avg_retransmits || 0, label: 'Avg'},
                  {val: result.iperf_min_retransmits || 0, label: 'Min'},
                  {val: result.iperf_max_retransmits || 0, label: 'Max'},
                ]}
              />
            )}
            <MetricGroup
              header="Beam"
              metrics={[
                {val: result.rx_beam_idx || 0, label: 'rx_idx'},
                {val: result.tx_beam_idx || 0, label: 'tx_idx'},
              ]}
            />
            <MetricGroup
              header="Packets"
              metrics={[
                {val: result.tx_packet_count || 0, label: 'tx'},
                {val: result.rx_packet_count || 0, label: 'rx'},
                {
                  val: convertToExp(result.tx_per || 0),
                  label: 'tx per',
                },
                {
                  val: convertToExp(result.rx_per || 0),
                  label: 'rx per',
                },
              ]}
            />
          </>
        }
      />
    </>
  );
}

function convertToExp(val: number): string {
  if (typeof val === 'number') {
    return val.toExponential(1);
  }
  return 'N/A';
}
