/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as networkTestAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import ResultExport from '../ResultExport';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const getTestExecutionMock = jest
  .spyOn(networkTestAPIUtil, 'getExecutionResults')
  .mockImplementation(() => Promise.resolve({data: {testResults: {id: '2'}}}));

window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

const enqueueSnackbarMock = jest.fn();
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(enqueueSnackbarMock);

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
