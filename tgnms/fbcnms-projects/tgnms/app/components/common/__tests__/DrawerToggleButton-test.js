/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import DrawerToggleButton from '../DrawerToggleButton';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  drawerWidth: 0,
  isOpen: true,
  onDrawerToggle: jest.fn(),
};

test('renders', () => {
  const {getByTestId} = render(
    <TestApp>
      <DrawerToggleButton {...defaultProps} />
    </TestApp>,
  );
  expect(getByTestId('drawer-toggle-button')).toBeInTheDocument();
});

test('renders', () => {
  const {getByTestId} = render(
    <TestApp>
      <DrawerToggleButton {...defaultProps} />
    </TestApp>,
  );
  expect(getByTestId('drawer-toggle-button')).toBeInTheDocument();
  fireEvent.click(getByTestId('drawer-toggle-button'));
  expect(defaultProps.onDrawerToggle).toHaveBeenCalled();
});
