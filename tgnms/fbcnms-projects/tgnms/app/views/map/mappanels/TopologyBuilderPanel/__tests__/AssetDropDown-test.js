/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssetDropDown from '../AssetDropDown';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  title: 'testTitle',
  children: 'testChildren',
  onPanelChange: jest.fn(),
  expanded: true,
};

test('render closed without crashing', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <AssetDropDown {...defaultProps} expanded={false} />
    </TestApp>,
  );
  expect(getByText('testTitle')).toBeInTheDocument();
  expect(getByTestId('asset-collapsed')).toBeInTheDocument();
});

test('render open without crashing', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <AssetDropDown {...defaultProps} />
    </TestApp>,
  );
  expect(getByTestId('asset-expanded')).toBeInTheDocument();
  expect(getByText('testChildren')).toBeInTheDocument();
});

test('clicking title triggers onChange', () => {
  const {getByTestId} = render(
    <TestApp>
      <AssetDropDown {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByTestId('drawer-toggle-button'));
  expect(defaultProps.onPanelChange).toHaveBeenCalled();
});
