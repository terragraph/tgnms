/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import HealthHistogram from '../HealthHistogram';
import React from 'react';
import {TestApp, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';

const defaultProps = {
  healthExecutions: [
    {
      health: 0,
      executions: [
        {assetName: 'link1', results: []},
        {assetName: 'link2', results: []},
      ],
    },
    {health: 2, executions: [{assetName: 'link3', results: []}]},
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
