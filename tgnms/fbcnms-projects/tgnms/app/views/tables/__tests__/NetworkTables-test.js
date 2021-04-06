/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkTables from '../NetworkTables';
import React from 'react';
import axios from 'axios';
import {NetworkContextWrapper, TestApp} from '../../../tests/testHelpers';
import {Route} from 'react-router-dom';
import {act, fireEvent, render} from '@testing-library/react';

jest
  .spyOn(axios, 'default')
  .mockImplementation(() => Promise.resolve({data: {}}));

const defaultProps = {
  selectedElement: null,
  isEmbedded: false,
  onResize: jest.fn(),
  tableHeight: 100,
  classes: {},
};
describe('Export', () => {
  test('clicking export button opens export menu', () => {
    const {getByTestId} = render(
      <TestApp route="/nodes">
        <NetworkContextWrapper>
          <Route
            path="/"
            render={r => <NetworkTables {...defaultProps} {...r} />}
          />
        </NetworkContextWrapper>
      </TestApp>,
      {baseElement: document?.body ?? undefined},
    );
    const menuButton = getByTestId('export-menu-button');
    act(() => {
      fireEvent.click(menuButton);
    });
    expect(getByTestId('export-menu')).toBeInTheDocument();
  });
  test('clicking export csv calls csv api endpoint', async () => {
    const getMock = jest.spyOn(axios, 'get').mockResolvedValueOnce({});
    const {getByTestId, getByText} = render(
      <TestApp route="/nodes">
        <NetworkContextWrapper contextValue={{networkName: 'testnetwork'}}>
          <Route
            path="/"
            render={r => <NetworkTables {...defaultProps} {...r} />}
          />
        </NetworkContextWrapper>
      </TestApp>,
      {baseElement: document?.body ?? undefined},
    );
    expect(getMock).not.toHaveBeenCalled();
    const menuButton = getByTestId('export-menu-button');
    act(() => {
      fireEvent.click(menuButton);
    });
    await act(async () => {
      fireEvent.click(getByText('CSV'));
    });
    expect(getMock).toHaveBeenCalledWith('/export/testnetwork/nodes/csv', {
      cancelToken: expect.any(Object),
    });
  });
});
