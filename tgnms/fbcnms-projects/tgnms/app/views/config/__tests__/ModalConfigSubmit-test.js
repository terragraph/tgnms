/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ModalConfigSubmit from '../ModalConfigSubmit';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(() => null),
  onSubmit: jest.fn(() => null),
  draftConfig: null,
  configOverrides: null,
};

const testConfig = {
  flags: {
    bstar_peer_host: '2001:470:f0:3e8::e3e',
  },
};

const testConfigChanges = {
  flags: {
    bstar_peer_host: '2001:470:f0:3e8::e3',
  },
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigSubmit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Review Changes')).toBeInTheDocument();
});

test('does not render when closed', () => {
  const {queryByText} = render(
    <TestApp>
      <ModalConfigSubmit {...defaultProps} isOpen={false} />
    </TestApp>,
  );
  expect(queryByText('Review Changes')).not.toBeInTheDocument();
});

test('properly displays changes', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigSubmit
        {...defaultProps}
        configOverrides={testConfigChanges}
        draftConfig={testConfig}
      />
    </TestApp>,
  );
  expect(
    getByText('"bstar_peer_host": "2001:470:f0:3e8::e3"'),
  ).toBeInTheDocument();
  expect(
    getByText('"bstar_peer_host": "2001:470:f0:3e8::e3e"'),
  ).toBeInTheDocument();
});

test('Cancel button click', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigSubmit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Review Changes')).toBeInTheDocument();
  fireEvent.click(getByText('Cancel'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});

test('Submit button click', () => {
  const {getByText} = render(
    <TestApp>
      <ModalConfigSubmit {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Review Changes')).toBeInTheDocument();
  fireEvent.click(getByText('Submit'));
  expect(defaultProps.onSubmit).toHaveBeenCalled();
});
