/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import ScheduleActions from '../ScheduleActions';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';
import {mockSchedules} from '@fbcnms/tg-nms/app/tests/data/NetworkTestApi';

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
  expect(getByText('Pause')).toBeInTheDocument();
  expect(getByText('Delete')).toBeInTheDocument();
});

test('disable click', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleActions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Pause')).toBeInTheDocument();
  fireEvent.click(getByText('Pause'));
  expect(defaultProps.onSetDisableSchedule).toHaveBeenCalled();
});

test('delete click', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleActions {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Delete')).toBeInTheDocument();
  fireEvent.click(getByText('Delete'));
  expect(defaultProps.onDeleteSchedule).toHaveBeenCalled();
});
