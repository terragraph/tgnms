/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import StatGraph from '../StatGraph';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

const defaultProps = {
  statName: 'testName',
  data: [
    {
      type: 'scatter',
      mode: 'lines+points',
      x: [0],
      y: [2],
      marker: {color: 'green'},
      text: `test text`,
    },
  ],
  startTime: 0,
  endTime: 1,
};

test('renders', () => {
  const {getByText, getByTestId} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <StatGraph {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByText('testName')).toBeInTheDocument();
  expect(getByTestId('plotly-graph-wrapper')).toBeInTheDocument();
});
