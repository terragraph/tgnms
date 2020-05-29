/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import HealthGroupDropDown from '../HealthGroupDropDown';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  executions: [{linkName: 'testLink', results: []}],
  onRowSelect: jest.fn(),
  dropDownText: 'testText',
  health: 0,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <HealthGroupDropDown {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testText')).toBeInTheDocument();
});

test('drops down when clicked', () => {
  const {getByTestId} = render(
    <TestApp>
      <HealthGroupDropDown {...defaultProps} />
    </TestApp>,
  );
  expect(getByTestId('drawer-toggle-button')).toBeInTheDocument();
  fireEvent.click(getByTestId('drawer-toggle-button'));
  expect(getByTestId('drop-down-table')).toBeInTheDocument();
});
