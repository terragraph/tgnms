/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import HealthHistogram from '../HealthHistogram';
import React from 'react';
import {TestApp, renderAsync} from '../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  healthExecutions: [
    {
      health: 0,
      executions: [
        {linkName: 'link1', results: []},
        {linkName: 'link2', results: []},
      ],
    },
    {health: 2, executions: [{linkName: 'link3', results: []}]},
  ],
};

test('renders', async () => {
  const {container} = await renderAsync(
    <TestApp>
      <HealthHistogram {...defaultProps} />
    </TestApp>,
  );
  expect(container.firstChild).toHaveClass('js-plotly-plot');
});
