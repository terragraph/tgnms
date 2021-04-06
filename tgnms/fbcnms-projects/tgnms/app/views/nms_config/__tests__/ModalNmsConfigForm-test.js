/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import ModalNmsConfigForm from '../ModalNmsConfigForm';
import React from 'react';
import nullthrows from '@fbcnms/util/nullthrows';
import {
  TestApp,
  mockNetworkConfig,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  open: true,
  networkConfig: {...mockNetworkConfig(), name: 'test'},
  onClose: jest.fn(() => {}),
  onCreateNetwork: jest.fn(() => {}),
  onEditNetwork: jest.fn(() => {}),
  networkList: {...mockNetworkConfig(), name: 'test'},
  type: 'CREATE',
};

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Network')).toBeInTheDocument();
});

test('if open is false doesnt render', () => {
  const {queryByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm {...defaultProps} open={false} />
    </TestApp>,
  );
  expect(queryByText('Add Network')).not.toBeInTheDocument();
});

test('renders when wireless_controller is null', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm
        {...defaultProps}
        networkConfig={{
          ...mockNetworkConfig({wireless_controller: null}),
          name: 'test',
        }}
      />
    </TestApp>,
  );
  expect(getByText('Add Network')).toBeInTheDocument();
});

test('cancel click', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Network')).toBeInTheDocument();
  expect(getByText('Cancel')).toBeInTheDocument();
  fireEvent.click(getByText('Cancel'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});

test('save click with incorrect fields errors show', async () => {
  const {getByText, getAllByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Network')).toBeInTheDocument();
  expect(getByText('Save')).toBeInTheDocument();
  const primaryApiIp = nullthrows(document.getElementById('primaryApiIp'));
  fireEvent.change(primaryApiIp, {target: {value: ' '}});
  fireEvent.click(getByText('Save'));
  expect(getAllByText('Please enter a hostname.')[0]).toBeInTheDocument();
});

test('save click with correct fields works', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ModalNmsConfigForm {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Add Network')).toBeInTheDocument();
  const network = nullthrows(document.getElementById('network'));
  fireEvent.change(network, {target: {value: 's'}});
  const primaryApiIp = nullthrows(document.getElementById('primaryApiIp'));
  fireEvent.change(primaryApiIp, {
    target: {value: '2620:10d:c089:e009:1a66:daff:fee8:000'},
  });
  const primaryE2eIp = nullthrows(document.getElementById('primaryE2eIp'));
  fireEvent.change(primaryE2eIp, {
    target: {value: '2620:10d:c089:e009:1a66:daff:fee8:000'},
  });
  fireEvent.click(getByText('Save'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});
