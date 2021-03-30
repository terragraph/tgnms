/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import Grid from '@material-ui/core/Grid';
import HealthTextSquare from './HealthTextSquare';
import MetricGroup from './MetricGroup';
import NetworkContext from '../../contexts/NetworkContext';
import ShowAdvanced from '../../components/common/ShowAdvanced';
import Typography from '@material-ui/core/Typography';
import {HEALTH_CODES, getHealthDef} from '../../constants/HealthConstants';
import {makeStyles} from '@material-ui/styles';
import {numToMegabitsString} from '../../helpers/ScheduleHelpers';
import {objectValuesTypesafe} from '../../helpers/ObjectHelpers';

import type {ExecutionResultDataType} from '../../../shared/dto/NetworkTestTypes';
import type {NodeType} from '../../../shared/types/Topology';

const useDetailStyles = makeStyles(theme => ({
  assetNameWrapper: {
    width: '100%',
    marginBottom: theme.spacing(),
  },
  assetName: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
    color: theme.palette.grey[600],
    overflow: 'hidden',
    textWrap: 'nowrap',
    textOverflow: 'ellipsis',
  },
  assetHealth: {
    marginBottom: theme.spacing(),
    textTransform: 'capitalize',
  },
}));

export default function AssetDirectionDetails({
  result,
  targetThroughput,
}: {|
  result: ExecutionResultDataType,
  targetThroughput: ?number,
|}) {
  const {linkMap, nodeMap, macToNodeMap} = React.useContext(NetworkContext);
  const link = linkMap[result.asset_name];

  const {srcName, dstName} = React.useMemo(() => {
    if (link) {
      const nodeA = macToNodeMap[link.a_node_mac];
      const nodeAMacAddr = nodeMap[nodeA].mac_addr;
      return {
        srcName:
          result.src_node_mac === nodeAMacAddr
            ? link.a_node_name
            : link.z_node_name,
        dstName:
          result.dst_node_mac === nodeAMacAddr
            ? link.a_node_name
            : link.z_node_name,
      };
    }

    return objectValuesTypesafe<NodeType>(nodeMap).reduce(
      (final, node) => {
        if (node.mac_addr === result.dst_node_mac) {
          final.dstName = node.name;
        }
        if (node.mac_addr === result.src_node_mac) {
          final.srcName = node.name;
        }
        return final;
      },
      {srcName: '', dstName: ''},
    );
  }, [link, result, macToNodeMap, nodeMap]);

  const classes = useDetailStyles();
  return (
    <>
      <Grid className={classes.assetNameWrapper} container direction="row">
        <Typography className={classes.assetName} variant="body2">
          {srcName}
        </Typography>
        <Typography className={classes.assetName} variant="body2">
          <ArrowForwardIcon fontSize="small" />
        </Typography>
        <Typography className={classes.assetName} variant="body2">
          {dstName}
        </Typography>
      </Grid>

      <Grid className={classes.assetHealth} item>
        <Typography variant="subtitle2">
          <HealthTextSquare
            health={HEALTH_CODES[result.health]}
            text={getHealthDef(HEALTH_CODES[result.health]).name}
          />
        </Typography>
      </Grid>

      <MetricGroup
        header="Summary"
        metrics={
          link
            ? [
                {val: result.mcs_avg || 0, label: 'MCS Avg'},
                {
                  val: result.snr_avg || 0,
                  label: 'SNR Avg',
                  metricUnit: 'dBm',
                },
                {
                  val: result.tx_pwr_avg || 0,
                  label: 'Tx Power',
                  metricUnit: 'dBm',
                },
                {
                  val: convertToExp((result.tx_per || 0) * 100),
                  label: 'PER',
                  metricUnit: '%',
                },
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
              ]
            : [
                {
                  val:
                    (new Date(result.end_dt).getTime() -
                      new Date(result.start_dt).getTime()) /
                      1000 || 0,
                  label: 'Duration',
                  metricUnit: 'Seconds',
                },
              ]
        }
      />
      <MetricGroup
        header="Iperf Throughput"
        groupUnits="Mbps"
        metrics={[
          {val: targetThroughput || 0, label: 'Target'},
          {val: result.iperf_avg_throughput || 0, label: 'Avg'},
          {val: result.iperf_min_throughput || 0, label: 'Min'},
          {val: result.iperf_max_throughput || 0, label: 'Max'},
        ]}
        format={x => numToMegabitsString(x)}
      />
      {link ? (
        <ShowAdvanced
          children={
            <>
              <MetricGroup
                header="Iperf Lost Datagram"
                groupUnits="%"
                metrics={[
                  {val: result.iperf_avg_lost_percent || 0, label: 'Avg'},
                  {val: result.iperf_min_lost_percent || 0, label: 'Min'},
                  {val: result.iperf_max_lost_percent || 0, label: 'Max'},
                ]}
              />
              <MetricGroup
                header="Beam"
                metrics={[
                  {val: result.rx_beam_idx || 0, label: 'Rx Idx'},
                  {val: result.tx_beam_idx || 0, label: 'Tx Idx'},
                ]}
              />
              <MetricGroup
                header="Packets"
                metrics={[
                  {val: result.tx_packet_count || 0, label: 'Tx'},
                  {val: result.rx_packet_count || 0, label: 'Rx'},
                  {
                    val: convertToExp((result.tx_per || 0) * 100),
                    label: 'Tx PER',
                    metricUnit: '%',
                  },
                  {
                    val: convertToExp((result.rx_per || 0) * 100),
                    label: 'Rx PER',
                    metricUnit: '%',
                  },
                ]}
              />
            </>
          }
        />
      ) : (
        <MetricGroup
          header="Iperf Retransmits"
          metrics={[
            {val: result.iperf_avg_retransmits || 0, label: 'Avg'},
            {val: result.iperf_min_retransmits || 0, label: 'Min'},
            {val: result.iperf_max_retransmits || 0, label: 'Max'},
          ]}
        />
      )}
    </>
  );
}

function convertToExp(val: number): string {
  if (typeof val === 'number') {
    return val.toExponential(1);
  }
  return 'N/A';
}
