/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import * as SnackbarMock from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import NmsExportForm from '../NmsExportForm';
import React from 'react';
import axiosMock from 'axios';
import {TestApp, readBlob} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';

jest.mock('axios');
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));
const FileSaverMock = jest.requireMock('file-saver');

describe('NmsExportForm', () => {
  // Setup Helpers
  const renderComponent = () => {
    const {getByText} = render(
      <TestApp>
        <NmsExportForm />
      </TestApp>,
    );
    return {getByText};
  };

  it('should save response from export api request', async () => {
    // Set up mocks and spies.
    const apiResponse = {payload: 'my_data'};
    axiosMock.post.mockImplementation(() =>
      Promise.resolve({data: apiResponse}),
    );

    // Execute assertions
    const {getByText} = renderComponent();
    const button = getByText('Export');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(axiosMock.post).toHaveBeenCalledWith('/export');
    expect(FileSaverMock.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'nms_export.json',
    );

    // Verify blob object is the response from /export.
    const blob = FileSaverMock.saveAs.mock.calls[0][0];
    expect(blob.type).toBe('octet/stream');
    const text = await readBlob(blob);
    expect(JSON.parse(text)).toMatchObject(apiResponse);
  });
  it('should throw an error message to snackbar', async () => {
    // Set up mocks and spies.
    axiosMock.post.mockImplementation(() => Promise.reject());
    const mockErrorFn = jest.fn();
    jest.spyOn(SnackbarMock, 'useSnackbars').mockImplementation(() => {
      return {error: mockErrorFn};
    });

    // Execute assertions
    const {getByText} = renderComponent();
    const button = getByText('Export');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(axiosMock.post).toHaveBeenCalledWith('/export');
    expect(mockErrorFn).toHaveBeenCalledWith(
      'Unable to export NMS data right now',
    );
  });
});
