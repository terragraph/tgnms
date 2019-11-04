/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import ConfigFormInput from '../ConfigFormInput';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  metadata: {},
  value: '',
  onChange: jest.fn(_val => true),
};

test('renders without crashing', () => {
  const {_getByText} = render(
    <TestApp>
      <ConfigFormInput {...defaultProps} />
    </TestApp>,
  );
  expect(document.getElementById('localValue')).toBeInTheDocument();
});

test('editing config values calls onChange with correct input', () => {
  const {_getByText} = render(
    <TestApp>
      <ConfigFormInput {...defaultProps} />
    </TestApp>,
  );
  const input = document.getElementById('localValue');
  fireEvent.change(input, {target: {value: 'test'}});
  expect(defaultProps.onChange).toHaveBeenCalledWith('test', 'test');
  expect(input).toBeInTheDocument();
});
