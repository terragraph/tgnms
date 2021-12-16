/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkConfig from '../NetworkConfig';
import React from 'react';
import {TestApp, initWindowConfig} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, waitFor} from '@testing-library/react';
import {renderWithRouter} from '@fbcnms/tg-nms/app/tests/testHelpers';

beforeEach(() => {
  initWindowConfig({
    featureFlags: {
      JSON_CONFIG_ENABLED: true,
      FORM_CONFIG_ENABLED: true,
      TABLE_CONFIG_ENABLED: true,
    },
  });
});

test('renders spinner initially without crashing', () => {
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <NetworkConfig />
    </TestApp>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders table after spinner', async () => {
  const {queryByTestId, getByLabelText, getByText} = renderWithRouter(
    <TestApp>
      <NetworkConfig />
    </TestApp>,
  );
  await waitFor(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  expect(getByLabelText('Editor')).toBeInTheDocument();
  expect(getByText('Submit')).toBeInTheDocument();
});

test('renders multiple tabs based on edit mode', async () => {
  const {queryByTestId, getByText} = renderWithRouter(
    <TestApp>
      <NetworkConfig />
    </TestApp>,
  );
  await waitFor(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  expect(getByText('CONTROLLER')).toBeInTheDocument();
});

test('change table without crashing', async () => {
  const {queryByTestId, getByText, getByLabelText} = renderWithRouter(
    <TestApp>
      <NetworkConfig />
    </TestApp>,
  );
  await waitFor(() => getByText('Cancel'));
  expect(queryByTestId('loading-box')).not.toBeInTheDocument();
  fireEvent.click(getByText('NETWORK'));
  expect(getByLabelText('Change Base Version')).toBeInTheDocument();
});
