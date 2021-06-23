/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as FileSaverMock from 'file-saver';
import * as ServiceApiUtilMock from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import * as SnackbarMock from '@fbcnms/tg-nms/app/hooks/useSnackbar';
import NetworkExport from '../NetworkExport';
import React from 'react';

import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';

import {act, fireEvent, render} from '@testing-library/react';
import {mockNetworkInstanceConfig} from '@fbcnms/tg-nms/app/tests/testHelpers';

// Setup global mocks and spies.
const mockComplete = jest.fn();
jest
  .mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil', () => ({
    apiRequest: jest.fn(),
  }))
  .mock('file-saver', () => ({
    saveAs: jest.fn(),
  }));

// Setup Helpers
const renderComponent = () => {
  const {getByText} = render(
    <TestApp>
      <NetworkExport
        networkConfig={mockNetworkInstanceConfig({name: 'test_network'})}
        onComplete={() => mockComplete()}
      />
    </TestApp>,
  );
  return getByText;
};

// Test Suite
describe('NetworkExport', () => {
  afterEach(() => {
    mockComplete.mockReset();
  });

  it('should save the response from api service', async () => {
    const apiResponse = {payload: 'my_data'};
    // Create mocks and spies.
    jest.spyOn(ServiceApiUtilMock, 'apiRequest').mockImplementation(() => {
      return Promise.resolve(apiResponse);
    });

    // Execute
    const getByText = renderComponent();
    const button = getByText('JSON Topology Export');
    expect(button).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(ServiceApiUtilMock.apiRequest).toHaveBeenCalledWith({
      networkName: 'test_network',
      endpoint: 'getTopology',
    });
    expect(FileSaverMock.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'test_network_topology.json',
    );

    // Verify blob object is the api response.
    const blob = FileSaverMock.saveAs.mock.calls[0][0];
    const text = await new Promise((res, _) => {
      const fr = new FileReader();
      fr.onload = function () {
        res(this.result);
      };
      fr.readAsText(blob);
    });
    expect(JSON.parse(text)).toMatchObject(apiResponse);
  });

  describe('error handling', () => {
    const mockErrorFn = jest.fn();
    beforeAll(() => {
      jest.spyOn(SnackbarMock, 'useSnackbars').mockImplementation(() => {
        return {
          error: mockErrorFn,
        };
      });
    });

    afterEach(() => {
      mockErrorFn.mockReset();
    });

    it('should throw a custom error message', async () => {
      // Setup mocks and spies
      jest.spyOn(ServiceApiUtilMock, 'apiRequest').mockImplementation(() => {
        return Promise.reject({
          response: {data: {message: 'I dont feel so good Mr. Stark'}},
        });
      });
      const getByText = renderComponent();
      await act(async () => {
        fireEvent.click(getByText('JSON Topology Export'));
      });
      expect(mockErrorFn).toHaveBeenCalledWith('I dont feel so good Mr. Stark');
      expect(mockComplete).toHaveBeenCalled();
    });

    describe('should throw the default error message', () => {
      const cases = [
        ['response.data.message', {response: {data: {message: null}}}],
        ['response.data', {response: {data: null}}],
        ['response', {response: null}],
        ['', null],
      ];
      test.each(cases)('when %p is null', async (_, response) => {
        jest.spyOn(ServiceApiUtilMock, 'apiRequest').mockImplementation(() => {
          return Promise.reject(response);
        });
        const getByText = renderComponent();
        await act(async () => {
          fireEvent.click(getByText('JSON Topology Export'));
        });
        expect(mockErrorFn).toHaveBeenCalledWith(
          'Unable to export json topology.',
        );
      });
    });
  });
});
