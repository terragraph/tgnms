/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
  uploadTopology: {sites: [{}, {}, {}], nodes: [], links: []},
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
  expect(getByText('3 new sites')).toBeInTheDocument();
  expect(
    getByText('The following items will be added to testName'),
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
    getByText('The following items will be added to testName'),
  ).toBeInTheDocument();
  fireEvent.click(getByText('Add 3 topology elements'));
  expect(defaultProps.onSubmit).toHaveBeenCalled();
});

test('opening modal triggers topology to be set', () => {
  const mockUploadTopology = jest.fn();
  const {getByText} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper contextValue={{networkName: 'testName'}}>
        <UploadTopologyConfirmationModal
          {...defaultProps}
          uploadTopology={mockUploadTopology}
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
