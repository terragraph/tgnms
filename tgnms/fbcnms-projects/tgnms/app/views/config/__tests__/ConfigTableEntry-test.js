/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import ConfigTableEntry from '../ConfigTableEntry';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  field: ['test'],
  layers: [{id: 'testID', value: 1}],
  hasOverride: false,
  hasTopLevelOverride: false,
  metadata: {type: 'STRING'},
  onDraftChange: jest.fn(() => {}),
  onSelect: jest.fn(() => {}),
  isSelected: false,
  isVisible: false,
  colSpan: 0,
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTableEntry {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
  expect(getByText('default')).toBeInTheDocument();
  expect(getByText('String')).toBeInTheDocument();
});

test('clicking row triggers onSelect', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTableEntry {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('test'));
  expect(defaultProps.onSelect).toHaveBeenCalledWith(['test']);
  expect(getByText('test')).toBeInTheDocument();
});

test('shows details when selected', () => {
  const {getByText} = render(
    <TestApp>
      <ConfigTableEntry {...defaultProps} isSelected={true} />
    </TestApp>,
  );
  expect(getByText('test')).toBeInTheDocument();
  expect(getByText('Description')).toBeInTheDocument();
  expect(getByText('Save')).toBeInTheDocument();
});
