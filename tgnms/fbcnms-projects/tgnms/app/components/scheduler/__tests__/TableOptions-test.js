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
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Last 30 days')).toBeInTheDocument();
});

test('onClick changes value of filter', () => {
  const {getByText, queryByText, getAllByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Last 30 days')).toBeInTheDocument();
  expect(queryByText('Last Year')).not.toBeInTheDocument();
  fireEvent.mouseDown(getByText('Last 30 days'));
  fireEvent.click(getByText('Last Year'));
  expect(getAllByText('Last Year')[0]).toBeInTheDocument();
});

test('onClick changes value of filter', () => {
  const {getByText} = render(
    <TestApp>
      <TableOptions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Last 30 days')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Last 30 days'));
  fireEvent.click(getByText('Last day'));
  expect(defaultProps.onOptionsUpdate).toHaveBeenCalled();
});
