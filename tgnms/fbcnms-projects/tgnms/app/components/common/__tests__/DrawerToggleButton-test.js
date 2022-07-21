/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import DrawerToggleButton from '../DrawerToggleButton';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

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
