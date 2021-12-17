/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import StatGraph from './StatGraph';
import {GRAY_BORDER} from '@fbcnms/tg-nms/app/MaterialTheme';
import {makeStyles} from '@material-ui/styles';
import type {PrometheusDataType} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';

export const GRAPH_LINE_NAME_MAX_LENGTH = 40;
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

export default function LinkGraphs({
  linkName,
  data,
  startTime,
  endTime,
}: {
  linkName: ?string,
  data: ?{
    snr: Array<PrometheusDataType>,
    topology_link_is_online: Array<PrometheusDataType>,
  },
  startTime: number,
  endTime: number,
}) {
  const {snr, topology_link_is_online} = data ?? {};
  const classes = useStyles();
  const lineGraphData = React.useMemo(
    () =>
      snr
        ?.filter(snrLink => snrLink.metric.linkName === linkName)
        .map((snrLinkEvent, index) => {
          const x = [];
          const y = [];
          snrLinkEvent.values.map(value => {
            if (startTime < value[0] * SEC_TO_MS) {
              x.push(value[0] * SEC_TO_MS);
              y.push(value[1]);
            }
          });
          return {
            type: 'scatter',
            mode: 'lines+points',
            x,
            y,
            marker: {color: index === 0 ? 'green' : 'red'},
            text: `Link direction ${snrLinkEvent.metric.linkDirection ?? ''}`,
          };
        }),
    [linkName, snr, startTime],
  );

  const linkAvailabilityData = React.useMemo(
    () =>
      topology_link_is_online
        ?.filter(onlineLink => onlineLink.metric.linkName === linkName)
        .map((onlineLinkEvent, index) => {
          const x = [];
          const y = [];
          const text = [];
          onlineLinkEvent.values.map(value => {
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
    [linkName, topology_link_is_online, startTime],
  );

  return (
    <Paper square elevation={0} className={classes.graphsWrapper}>
      <Grid item container spacing={4}>
        <Grid item container xs={12} className={classes.backgroundColor}>
          <Grid item>
            <CompareArrowsIcon />
          </Grid>
          <Grid item className={classes.nodeName}>
            {linkName}
          </Grid>
        </Grid>
        <Grid item xs={12} container className={classes.statsWrapper}>
          <StatGraph
            statName="Availability"
            data={linkAvailabilityData}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="SNR"
            data={lineGraphData}
            startTime={startTime}
            endTime={endTime}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
