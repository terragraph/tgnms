/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import {HEALTH_CODES, HEALTH_DEFS} from '../../constants/HealthConstants';
import {NETWORK_TEST_HEALTH_COLOR_RANGE} from '../../constants/LayerConstants';

import type {HealthExecutionType} from './NetworkTestTypes';

const Plot = createPlotlyComponent(Plotly);

const HEALTH_AXIS = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].name,
  HEALTH_DEFS[HEALTH_CODES.GOOD].name,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].name,
  HEALTH_DEFS[HEALTH_CODES.POOR].name,
  HEALTH_DEFS[HEALTH_CODES.MISSING].name,
];

type Props = {|
  healthExecutions: Array<HealthExecutionType>,
  className?: string,
|};

export default function HealthHistogram({
  healthExecutions,
  className = '',
}: Props) {
  /**
   * testResults is an array of pairs of test results(one for each direction).
   * flatten it to get each test result
   */
  const totalLinks = healthExecutions.reduce(
    (totalLinks, res) => totalLinks + res.executions.length,
    0,
  );

  const counts = healthExecutions
    .sort((a, b) => a.health - b.health)
    .map(healthExecution => healthExecution.executions.length);

  return (
    <Plot
      className={className}
      data={[
        {
          type: 'bar',
          x: HEALTH_AXIS,
          y: counts,
          marker: {
            color: NETWORK_TEST_HEALTH_COLOR_RANGE,
          },
        },
      ]}
      config={{
        displaylogo: false,
        displayModeBar: false,
      }}
      useResizeHandler={true}
      layout={{
        autosize: true,
        title: {
          text: 'Link Health',
          x: 0,
          font: {
            color: 'black',
          },
        },
        margin: {
          l: 25,
          r: 25,
          t: 25,
        },
        yaxis: {
          range: [0, totalLinks],
        },
        bargap: 0,
      }}
    />
  );
}
