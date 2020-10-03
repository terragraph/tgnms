/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import TableOptions from '../TableOptions';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  onOptionsUpdate: jest.fn(),
  optionsInput: [],
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('30 days ago')).toBeInTheDocument();
});

test('onClick changes value of filter', () => {
  const {getByText, queryByText, getAllByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('30 days ago')).toBeInTheDocument();
  expect(queryByText('A year ago')).not.toBeInTheDocument();
  fireEvent.mouseDown(getByText('30 days ago'));
  fireEvent.click(getByText('A year ago'));
  expect(getAllByText('A year ago')[0]).toBeInTheDocument();
});

test('onClick changes value of filter', () => {
  const {getByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('30 days ago')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('30 days ago'));
  fireEvent.click(getByText('Yesterday'));
  expect(defaultProps.onOptionsUpdate).toHaveBeenCalled();
});
