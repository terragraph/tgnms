/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ModalConfigGet from '../ModalConfigGet';
import React from 'react';
import {TestApp, mockNetworkConfig} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(() => null),
  networkConfig: mockNetworkConfig(),
  networkName: 'test',
  nodeInfo: {
    name: '',
    macAddr: 'test',
    isAlive: false,
    version: null,
    firmwareVersion: null,
    hardwareBoardId: null,
    hasOverride: false,
    isCn: false,
    isPop: false,
  },
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigGet {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Node Configuration')).toBeInTheDocument();
});

test('does not render when closed', () => {
  const {queryByText} = render(
    <TestApp>
      <ModalConfigGet {...defaultProps} isOpen={false} />
    </TestApp>,
  );
  expect(queryByText('Full Node Configuration')).not.toBeInTheDocument();
});

test('Close button click', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigGet {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Full Node Configuration')).toBeInTheDocument();
  fireEvent.click(getByText('Close'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});
