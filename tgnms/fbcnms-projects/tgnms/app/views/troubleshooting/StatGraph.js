/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import Grid from '@material-ui/core/Grid';
import React from 'react';
import ReactPlotlyLineGraph from './ReactPlotlyLineGraph';

import type {PlotlyDataType} from './ReactPlotlyLineGraph';

export default function StatGraph({
  statName,
  data,
  startTime,
  endTime,
}: {
  statName: string,
  data: Array<PlotlyDataType>,
  startTime: number,
  endTime: number,
}) {
  return (
    <Grid item container spacing={2} direction="row">
      <Grid item xs={1} style={{paddingTop: '40px'}}>
        {statName}
      </Grid>
      <Grid item xs={9} data-testid="plotly-graph-wrapper">
        <ReactPlotlyLineGraph
          width={Number(document.documentElement?.clientWidth) - 720}
          height={80}
          data={data}
          startTime={startTime}
          endTime={endTime}
        />
      </Grid>
    </Grid>
  );
}
