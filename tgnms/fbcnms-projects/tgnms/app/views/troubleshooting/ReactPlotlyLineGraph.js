/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';

// load the basic bundle of plotly to avoid bundle bloat
// includes scatter, pie, and bar
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

export type PlotlyDataType = {
  type: string,
  text: string | Array<string>,
  x: Array<number>,
  y: Array<string | number>,
  marker: {color: string},
  fill?: string,
};

export default function ReactPlotlyLineGraph({
  width,
  height,
  data,
  startTime,
  endTime,
}: {
  width: number,
  height: number,
  data: Array<PlotlyDataType>,
  startTime: number,
  endTime: number,
}) {
  return (
    <Plot
      data={data}
      layout={{
        height,
        margin: {
          l: 10,
          r: 10,
          b: 20,
          t: 10,
          pad: 5,
        },
        hovermode: 'closest',
        hoverdistance: -1,
        selectdirection: 'h',
        showlegend: false,
        width,
        xaxis: {
          type: 'date',
          tickformat: '%b %d %Hh',
          range: [new Date(startTime * 1000), new Date(endTime * 1000)],
        },
        yaxis: {
          visible: false,
        },
      }}
      config={{
        displayModeBar: false,
      }}
    />
  );
}
