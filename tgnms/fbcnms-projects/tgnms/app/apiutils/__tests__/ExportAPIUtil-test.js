/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import axiosMock from 'axios';
import {NetworkContextWrapper} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act} from '@testing-library/react';
import {readBlob} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {renderHook} from '@testing-library/react-hooks';
import {useExport} from '../ExportAPIUtil';

jest.mock('axios');
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));
const FileSaverMock = jest.requireMock('file-saver');

test('should save the response from api request', async () => {
  // Setup mocks & helpers.
  const apiResponse = 'my,csv,data';
  axiosMock.get.mockImplementation(() => {
    return Promise.resolve({data: apiResponse});
  });
  const wrapper = ({children}) => (
    <NetworkContextWrapper contextValue={{networkName: 'my_network'}}>
      {children}
    </NetworkContextWrapper>
  );

  // Execute
  const {result} = renderHook(() => useExport({table: 'my_table'}), {wrapper});
  await act(async () => {
    result.current.exportCSV();
  });

  // Assertions
  expect(FileSaverMock.saveAs).toHaveBeenCalledWith(
    expect.any(Blob),
    'my_network_my_table.csv',
  );
  const blob = FileSaverMock.saveAs.mock.calls[0][0];
  expect(blob.type).toBe('text/plain;charset=utf-8');
  const text = await readBlob(blob);
  expect(text).toBe(apiResponse);
});
