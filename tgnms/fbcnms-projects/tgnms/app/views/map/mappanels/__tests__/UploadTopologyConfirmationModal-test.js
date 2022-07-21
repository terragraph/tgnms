/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import UploadTopologyConfirmationModal from '../UploadTopologyConfirmationModal';
import {
  NetworkContextWrapper,
  TestApp,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';

const defaultProps = {
  onSubmit: jest.fn(),
  disabled: false,
  getUploadTopology: () => ({sites: [{}, {}, {}], nodes: [], links: []}),
};

test('renders without crashing', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <UploadTopologyConfirmationModal {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Upload')).toBeInTheDocument();
});

test('renders modal when clicked', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <UploadTopologyConfirmationModal {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Upload')).toBeInTheDocument();
  fireEvent.click(getByText('Upload'));
  expect(getByText('3 sites')).toBeInTheDocument();
  expect(
    getByText('The following will be added to the network:'),
  ).toBeInTheDocument();
});

test('onclick calls onSubmit', () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <UploadTopologyConfirmationModal {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Upload')).toBeInTheDocument();
  fireEvent.click(getByText('Upload'));
  expect(
    getByText('The following will be added to the network:'),
  ).toBeInTheDocument();
  fireEvent.click(getByText('Add to Network'));
  expect(defaultProps.onSubmit).toHaveBeenCalled();
});

test('opening modal triggers topology to be set', () => {
  const mockUploadTopology = jest.fn();
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <UploadTopologyConfirmationModal
          {...defaultProps}
          getUploadTopology={mockUploadTopology}
        />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Upload')).toBeInTheDocument();
  expect(mockUploadTopology).not.toHaveBeenCalled();
  act(() => {
    fireEvent.click(getByText('Upload'));
  });
  expect(mockUploadTopology).toHaveBeenCalled();
});
