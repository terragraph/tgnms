/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import React from 'react';
import ThroughputTestResult from '../ThroughputTestResult';
import {TestApp, mockRoutes} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  mockExecutionResult,
  mockExecutionResults,
} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';
import {render} from '@testing-library/react';

const defaultProps = {
  executionResult: {
    assetName: 'test',
    results: [mockExecutionResult(), mockExecutionResult()],
  },
  execution: mockExecutionResults().execution,
  routes: mockRoutes(),
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <MaterialTheme>
        <ThroughputTestResult {...defaultProps} />
      </MaterialTheme>
    </TestApp>,
  );
  expect(getByText('Download')).toBeInTheDocument();
  expect(getByText('Upload')).toBeInTheDocument();
});

test('renders details', () => {
  const {getAllByText} = render(
    <TestApp>
      <MaterialTheme>
        <ThroughputTestResult {...defaultProps} />
      </MaterialTheme>
    </TestApp>,
  );
  expect(getAllByText('EXCELLENT')[0]).toBeInTheDocument();
  expect(getAllByText('Summary')[0]).toBeInTheDocument();
  expect(getAllByText('Iperf Throughput')[0]).toBeInTheDocument();
});
