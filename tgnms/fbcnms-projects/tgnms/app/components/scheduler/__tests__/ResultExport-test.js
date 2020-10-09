/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import * as networkTestAPIUtil from '../../../apiutils/NetworkTestAPIUtil';
import ResultExport from '../ResultExport';
import {NetworkContextWrapper, TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

const getTestExecutionMock = jest
  .spyOn(networkTestAPIUtil, 'getExecutionResults')
  .mockImplementation(() => Promise.resolve({data: {testResults: {id: '2'}}}));

const enqueueSnackbarMock = jest.fn();
jest
  .spyOn(require('../../../hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(enqueueSnackbarMock);

afterEach(cleanup);

const defaultProps = {
  id: '1',
};

test('renders without crashing', () => {
  const {getByTestId} = render(
    <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
      <ResultExport {...defaultProps} />
    </NetworkContextWrapper>,
  );
  expect(getByTestId('download-button')).toBeInTheDocument();
});

test('download triggers api call', () => {
  const {getByTestId, getByText} = render(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <ResultExport {...defaultProps} />
      </NetworkContextWrapper>
      ,
    </TestApp>,
  );
  expect(getByTestId('download-button')).toBeInTheDocument();
  fireEvent.click(getByText('JSON'));
  expect(getTestExecutionMock).toHaveBeenCalled();
});
