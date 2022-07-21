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
import TabbedButton from '../TabbedButton';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  leftText: 'left',
  rightText: 'right',
  leftOnclick: jest.fn(),
  rightOnclick: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(<TabbedButton {...defaultProps} />);
  expect(getByText('left')).toBeInTheDocument();
  expect(getByText('right')).toBeInTheDocument();
});

test('leftClick works', () => {
  const {getByText} = render(<TabbedButton {...defaultProps} />);
  expect(getByText('left')).toBeInTheDocument();
  fireEvent.click(getByText('left'));
  expect(defaultProps.leftOnclick).toHaveBeenCalled();
});

test('rightClick works', () => {
  const {getByText} = render(<TabbedButton {...defaultProps} />);
  expect(getByText('right')).toBeInTheDocument();
  fireEvent.click(getByText('right'));
  expect(defaultProps.rightOnclick).toHaveBeenCalled();
});
