/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import CheckBoxDropDown from '../CheckBoxDropdown';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  title: 'testTitle',
  name: 'testName',
  menuItems: [{value: 'testValue', title: 'testItemTitle'}],
  onChange: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <CheckBoxDropDown {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testTitle')).toBeInTheDocument();
});

test('clicking opens checkboxes', () => {
  const {getByText} = render(
    <TestApp>
      <CheckBoxDropDown {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testTitle'));
  expect(getByText('testItemTitle')).toBeInTheDocument();
});

test('clicking input calls onChange', () => {
  const {getByText} = render(
    <TestApp>
      <CheckBoxDropDown {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testTitle'));
  expect(getByText('testItemTitle')).toBeInTheDocument();
  fireEvent.click(getByText('testItemTitle'));
  expect(defaultProps.onChange).toHaveBeenCalled();
});

test('clicking checkbox calls onChange', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <CheckBoxDropDown {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testTitle'));
  expect(getByTestId('checkbox')).toBeInTheDocument();
  fireEvent.click(getByTestId('checkbox'));
  expect(defaultProps.onChange).toHaveBeenCalled();
});
