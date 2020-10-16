/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TabbedButton from '../TabbedButton';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

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
