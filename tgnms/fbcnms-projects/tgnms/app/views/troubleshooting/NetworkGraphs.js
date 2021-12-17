/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import StatGraph from './StatGraph';
import {GRAY_BORDER} from '@fbcnms/tg-nms/app/MaterialTheme';
import {makeStyles} from '@material-ui/styles';

import type {PrometheusDataType} from '@fbcnms/tg-nms/app/apiutils/PrometheusAPIUtil';

const SEC_TO_MS = 1000;

const NODE_TYPES = {
  pop: 'pop',
  node: 'node',
  cn: 'cn',
  dn: 'dn',
};

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

export default function NetworkGraphs({
  startTime,
  endTime,
  data,
}: {
  startTime: number,
  endTime: number,
  data: ?{
    topology_online_wireless_links_ratio: Array<PrometheusDataType>,
    topology_node_is_online: Array<PrometheusDataType>,
    udp_pinger_loss_ratio: Array<PrometheusDataType>,
  },
}) {
  const {
    topology_online_wireless_links_ratio,
    topology_node_is_online,
    udp_pinger_loss_ratio,
  } = data ?? {};
  const classes = useStyles();
  const linksOnline = React.useMemo(
    () =>
      topology_online_wireless_links_ratio?.map((nodeEvent, index) => {
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
    [topology_online_wireless_links_ratio, startTime],
  );

  const udpData = React.useMemo(
    () =>
      udp_pinger_loss_ratio
        ?.filter(udpNode => udpNode.metric.nodeName === undefined)
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
    [udp_pinger_loss_ratio, startTime],
  );

  const nodeAvailabilityData = React.useMemo(() => {
    const x = [];
    const text = [];
    const yVals = {
      [NODE_TYPES.pop]: [],
      [NODE_TYPES.dn]: [],
      [NODE_TYPES.cn]: [],
      [NODE_TYPES.node]: [],
    };
    const count = {
      [NODE_TYPES.pop]: 0,
      [NODE_TYPES.dn]: 0,
      [NODE_TYPES.cn]: 0,
      [NODE_TYPES.node]: 0,
    };

    topology_node_is_online?.forEach((onlineNodeEvent, index) => {
      let type = NODE_TYPES.dn;
      if (onlineNodeEvent.metric.pop === 'true') {
        type = NODE_TYPES.pop;
      } else if (onlineNodeEvent.metric.cn === 'true') {
        type = NODE_TYPES.cn;
      }

      count[type]++;
      count.node++;

      onlineNodeEvent.values.forEach((value, i) => {
        if (startTime < value[0] * SEC_TO_MS) {
          if (index === 0) {
            x.push(value[0] * SEC_TO_MS);
            text.push(new Date(value[0] * SEC_TO_MS).toLocaleString());
          }
          yVals[type][i] = (yVals[type][i] ?? 0) + Number(value[1]);
          yVals.node[i] = (yVals.node[i] ?? 0) + Number(value[1]);
        }
      });
    });

    return Object.keys(yVals).reduce((res, key) => {
      const yValue = yVals[key].map(val => val / count[key]);
      res[key] = [
        {
          type: 'line',
          text,
          x,
          y: yValue,
          marker: {color: 'green'},
        },
      ];
      return res;
    }, {});
  }, [topology_node_is_online, startTime]);

  return (
    <Paper square elevation={0} className={classes.graphsWrapper}>
      <Grid item container spacing={4}>
        <Grid item xs={12} className={classes.backgroundColor}>
          Network
        </Grid>
        <Grid item xs={12} container className={classes.statsWrapper}>
          <StatGraph
            statName="Link Availability"
            data={linksOnline}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="Pop Availability"
            data={nodeAvailabilityData.pop}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="CN Availability"
            data={nodeAvailabilityData.cn}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="DN Availability"
            data={nodeAvailabilityData.dn}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="Node Availability"
            data={nodeAvailabilityData.node}
            startTime={startTime}
            endTime={endTime}
          />
          <StatGraph
            statName="L4 Instant Transport"
            data={udpData}
            startTime={startTime}
            endTime={endTime}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
