/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import MaterialTheme from '../../../../MaterialTheme';
import React from 'react';
import ThroughputTestResult from '../ThroughputTestResult';
import {TestApp, mockRoutes} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {
  mockExecutionResult,
  mockExecutionResults,
} from '../../../../tests/data/NetworkTestApi';

afterEach(cleanup);

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
