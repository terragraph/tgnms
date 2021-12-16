/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import ShowAdvanced from '../ShowAdvanced';
import TextField from '@material-ui/core/TextField';
import {TestApp, cast, renderAsync} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  children: [
    <TextField
      id="test"
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
  const {getByText} = render(
    <TestApp>
      <ShowAdvanced {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Show Advanced')).toBeInTheDocument();
});

test('clicking button Opens menu', async () => {
  const {getByText, getByLabelText} = await renderAsync(
    <TestApp>
      <ShowAdvanced {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Show Advanced')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(getByLabelText('test advanced input')).toBeInTheDocument();
});

test('clicking button twice Opens then closes menu', async () => {
  const {getByText, getByLabelText} = await renderAsync(
    <TestApp>
      <ShowAdvanced {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Show Advanced')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(getByLabelText('test advanced input')).toBeInTheDocument();
  fireEvent.click(getByText('Show Advanced'));
  expect(
    cast<{location: ?string}>(getByLabelText('test advanced input'))
      .location === null,
  );
});
