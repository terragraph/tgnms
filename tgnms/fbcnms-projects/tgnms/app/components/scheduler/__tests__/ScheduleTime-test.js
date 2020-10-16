/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import ScheduleTime from '../ScheduleTime';
import {MODAL_MODE} from '../../../constants/ScheduleConstants';
import {MuiPickersWrapper, renderAsync} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  type: 'test',
  onCronStringUpdate: jest.fn(),
  onAdHocChange: jest.fn(),
  adHoc: true,
  modalMode: MODAL_MODE.CREATE,
};

test('renders without crashing', () => {
  const {getByText} = render(<ScheduleTime {...defaultProps} />);
  expect(getByText('Start')).toBeInTheDocument();
});

test('clicking later adds date and time pickers and calls onAdHocChange', () => {
  const {getByText} = render(<ScheduleTime {...defaultProps} />);
  expect(getByText('later')).toBeInTheDocument();
  fireEvent.click(getByText('later'));
  expect(defaultProps.onAdHocChange).toHaveBeenCalled();
});

test('frequency selector changes cron string and call onCronStringUpdate ', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <ScheduleTime {...defaultProps} adHoc={false} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Weekly')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Weekly'));
  expect(getByText('Daily')).toBeInTheDocument();
  fireEvent.click(getByText('Daily'));
  expect(defaultProps.onCronStringUpdate).toHaveBeenCalled();
});

test('pickers change cron string and call onCronStringUpdate ', async () => {
  const {getByText} = await renderAsync(
    <MuiPickersWrapper>
      <ScheduleTime {...defaultProps} adHoc={false} />
    </MuiPickersWrapper>,
  );
  expect(getByText('Monday')).toBeInTheDocument();
  fireEvent.mouseDown(getByText('Monday'));
  expect(getByText('Tuesday')).toBeInTheDocument();
  fireEvent.click(getByText('Tuesday'));
  expect(defaultProps.onCronStringUpdate).toHaveBeenCalled();
});
