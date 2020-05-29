/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import * as networkTestAPIUtil from '../../../../apiutils/NetworkTestAPIUtil';
import MaterialTheme from '../../../../MaterialTheme';
import React from 'react';
import TestExecutionSummary from '../TestExecutionSummary';
import {
  NetworkContextWrapper,
  TestApp,
  renderAsync,
} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

const getTestExecutionMock = jest
  .spyOn(networkTestAPIUtil, 'getExecutionResults')
  .mockImplementation(() =>
    Promise.resolve({
      execution: {id: '1', test_type: 'PARALLEL'},
      results: [{asset_name: 'testLinkName', status: 'FINISHED'}],
    }),
  );

afterEach(cleanup);

const defaultProps = {
  testId: '1',
};

test('renders loading', () => {
  const {getByTestId} = render(
    <MaterialTheme>
      <TestExecutionSummary {...defaultProps} />
    </MaterialTheme>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders network test results if no selected element', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <MaterialTheme>
        <TestExecutionSummary {...defaultProps} />
      </MaterialTheme>
    </TestApp>,
  );
  expect(getTestExecutionMock).toHaveBeenCalled();
  expect(getByText('Parallel Link Test')).toBeInTheDocument();
});

test('renders link details if selected element', async () => {
  const {getAllByText} = await renderAsync(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          selectedElement: {expanded: true, name: 'testLinkName', type: 'link'},
        }}>
        <MaterialTheme>
          <TestExecutionSummary {...defaultProps} />
        </MaterialTheme>
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getTestExecutionMock).toHaveBeenCalled();
  expect(getAllByText('testLinkName').length).toBe(2);
});
