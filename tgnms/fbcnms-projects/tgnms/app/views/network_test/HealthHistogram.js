/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';
import type {TestResult} from '../../../shared/dto/TestResult';
import type {LinkTestResult} from './LinkTestResultDetails';
import {NETWORK_TEST_HEALTH_COLOR_RANGE} from '../../constants/LayerConstants';
import {HEALTH_CODES, HEALTH_DEFS} from '../../constants/HealthConstants';

import * as React from 'react';

import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

const HEALTH_AXIS = [
  HEALTH_DEFS[HEALTH_CODES.EXCELLENT].name,
  HEALTH_DEFS[HEALTH_CODES.HEALTHY].name,
  HEALTH_DEFS[HEALTH_CODES.MARGINAL].name,
  HEALTH_DEFS[HEALTH_CODES.WARNING].name,
  HEALTH_DEFS[HEALTH_CODES.UNKNOWN].name,
  HEALTH_DEFS[HEALTH_CODES.DOWN].name,
];

type Props = {|
  testResults: Array<LinkTestResult>,
  className: string,
|};

export default function HealthHistogram({testResults, className = ''}: Props) {
  /**
   * testResults is an array of pairs of test results(one for each direction).
   * flatten it to get each test result
   */
  const flattened = testResults
    .map(x => x.results)
    .reduce((flat, res) => flat.concat(res), []);
  const counts = getHealthResultCounts(flattened);

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
        title: 'Link Health',
        margin: {
          l: 20,
          r: 20,
        },
        yaxis: {
          range: [0, flattened.length],
        },
        bargap: 0,
      }}
    />
  );
}

function getHealthResultCounts(testResults: Array<TestResult>) {
  // counts is an array of ints whose index is the health status code
  const counts = HEALTH_AXIS.map(() => 0);
  testResults.forEach(test => {
    const health =
      typeof test.health === 'number' ? test.health : HEALTH_CODES.UNKNOWN;
    counts[health]++;
  });
  return counts;
}
