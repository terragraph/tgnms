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
import {
  NetworkContextWrapper,
  SnackbarWrapper,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

const getTestExecutionMock = jest
  .spyOn(networkTestAPIUtil, 'getExecutionResults')
  .mockImplementation(() => Promise.resolve({data: {testResults: {id: '2'}}}));

jest.mock('@fbcnms/ui/hooks/useSnackbar');

const enqueueSnackbarMock = jest.fn();
jest
  .spyOn(require('@fbcnms/ui/hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(enqueueSnackbarMock);

afterEach(cleanup);

const defaultProps = {
  id: '1',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <SnackbarWrapper>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <ResultExport {...defaultProps} />
      </NetworkContextWrapper>
    </SnackbarWrapper>,
  );
  expect(getByText('Download')).toBeInTheDocument();
});

test('download triggers api call', () => {
  const {getByText} = render(
    <SnackbarWrapper>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <ResultExport {...defaultProps} />
      </NetworkContextWrapper>
    </SnackbarWrapper>,
  );
  expect(getByText('Download')).toBeInTheDocument();
  fireEvent.click(getByText('JSON'));
  expect(getTestExecutionMock).toHaveBeenCalled();
});
