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
  readBlob,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));
const FileSaverMock = jest.requireMock('file-saver');

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

test('download triggers a file to be saved', async () => {
  const apiResponse = {testResults: {id: '2'}};
  const getTestExecutionMock = jest
    .spyOn(networkTestAPIUtil, 'getExecutionResults')
    .mockImplementation(() => Promise.resolve({results: apiResponse}));

  const {getByTestId, getByText} = render(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <ResultExport {...defaultProps} />
      </NetworkContextWrapper>
      ,
    </TestApp>,
  );
  expect(getByTestId('download-button')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(getByText('JSON'));
  });
  expect(getTestExecutionMock).toHaveBeenCalled();
  expect(FileSaverMock.saveAs).toHaveBeenCalledWith(
    expect.any(Blob),
    'network_test_results_1.json',
  );

  // Verify blob object is the response from getExecutionResults.
  const blob = FileSaverMock.saveAs.mock.calls[0][0];
  expect(blob.type).toBe('octet/stream');
  const text = await readBlob(blob);
  expect(JSON.parse(text)).toMatchObject(apiResponse);
});
