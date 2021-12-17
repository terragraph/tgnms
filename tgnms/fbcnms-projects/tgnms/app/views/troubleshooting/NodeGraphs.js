/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import StatGraph from './StatGraph';
import {GRAY_BORDER} from '@fbcnms/tg-nms/app/MaterialTheme';
import {makeStyles} from '@material-ui/styles';
import type {PrometheusDataType} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';

const SEC_TO_MS = 1000;

const useStyles = makeStyles(theme => ({
  graphsWrapper: {
    margin: theme.spacing(2),
    padding: theme.spacing(2),
    border: GRAY_BORDER,
  },
  statsWrapper: {backgroundColor: '#fafbff', paddingLeft: theme.spacing(7.5)},
  nodeName: {margin: theme.spacing(0.75)},
  backgroundColor: {backgroundColor: '#bfbfbf'},
}));

export default function NodeGraphs({
  nodeName,
  startTime,
  endTime,
  data,
}: {
  nodeName: ?string,
  startTime: number,
  endTime: number,
  data: ?{
    udp_pinger_loss_ratio: Array<PrometheusDataType>,
    topology_node_is_online: Array<PrometheusDataType>,
  },
}) {
  const {udp_pinger_loss_ratio, topology_node_is_online} = data ?? {};
  const classes = useStyles();
  const udpData = React.useMemo(
    () =>
      udp_pinger_loss_ratio
        ?.filter(udpNode => {
          const udpName = udpNode.metric.nodeName?.replace(/[\W_]+/g, ' ');
          const filteredName = nodeName?.replace(/[\W_]+/g, ' ');
          return udpName === filteredName;
        })
        .map((nodeEvent, index) => {
          const x = [];
          const y = [];
          const text = [];
          nodeEvent.values.map(value => {
            if (startTime < value[0] * SEC_TO_MS) {
              x.push(value[0] * SEC_TO_MS);
              y.push(value[1]);
              text.push(new Date(value[0] * SEC_TO_MS).toLocaleString());
            }
          });
          return {
            type: 'line',
            text,
            x,
            y,
            marker: {color: index === 0 ? 'green' : 'red'},
          };
        }),
    [nodeName, udp_pinger_loss_ratio, startTime],
  );

  const nodeAvailabilityData = React.useMemo(
    () =>
      topology_node_is_online
        ?.filter(onlineNode => onlineNode.metric.nodeName === nodeName)
        .map((onlineNodeEvent, index) => {
          const x = [];
          const y = [];
          const text = [];
          onlineNodeEvent.values.map(value => {
            if (startTime < value[0] * SEC_TO_MS) {
              x.push(value[0] * SEC_TO_MS);
              y.push(value[1]);
              text.push(new Date(value[0] * SEC_TO_MS).toLocaleString());
            }
          });
          return {
            type: 'line',
            fill: 'tozeroy',
            text,
            x,
            y,
            marker: {color: index === 0 ? 'green' : 'red'},
          };
        }),
    [nodeName, topology_node_is_online, startTime],
  );

  return (
    <Paper square elevation={0} className={classes.graphsWrapper}>
      <Grid item container spacing={4}>
        <Grid item xs={12} container className={classes.backgroundColor}>
          <Grid item>
            <RouterIcon />
          </Grid>
          <Grid item className={classes.nodeName}>
            {nodeName}
          </Grid>
        </Grid>
        <Grid item xs={12} container className={classes.statsWrapper}>
          <StatGraph
            statName="Availability"
            data={nodeAvailabilityData}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="L4 Transport"
            data={udpData}
            startTime={startTime}
            endTime={endTime}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
