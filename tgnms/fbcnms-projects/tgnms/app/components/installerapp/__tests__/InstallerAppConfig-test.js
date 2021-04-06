/**
 * Show / hide individual components based on user permissions. redirect if user
 * does not have ALL of the required permissions.
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import InstallerAppConfig from '../InstallerAppConfig';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {TestApp, renderAsync} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, render, wait} from '@testing-library/react';

import * as fbcHooks from '@fbcnms/ui/hooks';
jest.mock('@fbcnms/ui/hooks');
const useAxiosMock = jest
  .spyOn(fbcHooks, 'useAxios')
  .mockImplementation(jest.fn(() => ({data: {}})));

afterEach(() => {
  cleanup();
});

test('clicking the button opens the modal', () => {
  const {getByText} = render(
    <TestApp>
      <InstallerAppConfig>test text</InstallerAppConfig>,
    </TestApp>,
  );
  const button = getByText('test text');
  expect(button).toBeInTheDocument();
  act(() => {
    fireEvent.click(button);
  });
  expect(getByText(/mobile app setup/i)).toBeInTheDocument();
});

test('clicking the backdrop closes the modal', async () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <InstallerAppConfig>test text</InstallerAppConfig>,
    </TestApp>,
  );
  const button = getByText('test text');
  expect(button).toBeInTheDocument();
  act(() => {
    fireEvent.click(button);
  });
  expect(getByText(/mobile app setup/i)).toBeInTheDocument();
  act(() => {
    const backdrop = document.querySelector('[class="MuiBackdrop-root"]');
    fireEvent.click(nullthrows(backdrop));
  });
  await wait(() => {
    expect(queryByText(/mobile app setup/i)).not.toBeInTheDocument();
  });
});

test('makes a request to /mobileapp/clientconfig', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <InstallerAppConfig>test text</InstallerAppConfig>,
    </TestApp>,
  );

  const button = getByText('test text');
  expect(button).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(button);
  });

  expect(useAxiosMock).toHaveBeenCalledWith({
    method: 'GET',
    url: '/mobileapp/clientconfig',
  });
});
