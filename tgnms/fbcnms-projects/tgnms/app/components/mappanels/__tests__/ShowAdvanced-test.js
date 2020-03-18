/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import React from 'react';
import ShowAdvanced from '../ShowAdvanced';
import TextField from '@material-ui/core/TextField';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {renderAsync} from '../../../tests/testHelpers';

afterEach(cleanup);

const defaultProps = {
  children: [
    <TextField
      key="test"
      label={'test advanced input'}
      type="number"
      InputLabelProps={{shrink: true}}
      margin="dense"
      fullWidth
      required={false}
      value={'test'}
    />,
  ],
};

test('renders empty without crashing', () => {
  const {getByText} = render(<ShowAdvanced {...defaultProps} />);
  expect(getByText('Show Advanced')).toBeInTheDocument();
});

test('clicking button Opens menu', async () => {
  const {getByText} = await renderAsync(<ShowAdvanced {...defaultProps} />);
  expect(getByText('Show Advanced')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(getByText('test advanced input')).toBeInTheDocument();
});

test('clicking button twice Opens then closes menu', async () => {
  const {getByText} = await renderAsync(<ShowAdvanced {...defaultProps} />);
  expect(getByText('Show Advanced')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(getByText('test advanced input')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(getByText('test advanced input').location === null);
});
