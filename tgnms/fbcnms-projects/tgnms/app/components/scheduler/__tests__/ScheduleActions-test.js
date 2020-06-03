/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ScheduleActions from '../ScheduleActions';
import {BUTTON_TYPES} from '../../../constants/ScheduleConstants';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {mockSchedules} from '../../../tests/data/NetworkTestApi';

afterEach(cleanup);

const defaultProps = {
  editButton: 'test edit button',
  onDeleteSchedule: jest.fn(),
  onSetDisableSchedule: jest.fn(),
  row: mockSchedules().schedules[0],
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleActions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('test edit button')).toBeInTheDocument();
  expect(getByText(BUTTON_TYPES.disable)).toBeInTheDocument();
  expect(getByText(BUTTON_TYPES.delete)).toBeInTheDocument();
});

test('disable click', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleActions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText(BUTTON_TYPES.disable)).toBeInTheDocument();
  fireEvent.click(getByText(BUTTON_TYPES.disable));
  expect(defaultProps.onSetDisableSchedule).toHaveBeenCalled();
});

test('delete click', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleActions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText(BUTTON_TYPES.delete)).toBeInTheDocument();
  fireEvent.click(getByText(BUTTON_TYPES.delete));
  expect(defaultProps.onDeleteSchedule).toHaveBeenCalled();
});
