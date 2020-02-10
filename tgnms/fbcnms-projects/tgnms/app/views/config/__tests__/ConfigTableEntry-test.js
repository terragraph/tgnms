/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ConfigTableEntry from '../ConfigTableEntry';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

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
