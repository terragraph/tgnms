/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import SchedulerModal from '../SchedulerModal';
import {MODAL_MODE} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const defaultProps = {
  type: '',
  buttonTitle: 'testButtonTitle',
  modalTitle: 'testModalTitle',
  modalSubmitText: 'testSubmit',
  onSubmit: jest.fn(),
  modalMode: MODAL_MODE.CREATE,
  scheduleParams: {typeSelector: <div />, advancedParams: <div />},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <SchedulerModal {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testButtonTitle')).toBeInTheDocument();
});

test('renders modal when clicked', () => {
  const {getByText} = render(
    <TestApp>
      <SchedulerModal {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testButtonTitle')).toBeInTheDocument();
  fireEvent.click(getByText('testButtonTitle'));
  expect(getByText('testModalTitle')).toBeInTheDocument();
  expect(getByText('testSubmit')).toBeInTheDocument();
});

test('onclick calls onSubmit', () => {
  const {getByText} = render(
    <TestApp>
      <SchedulerModal {...defaultProps} />
    </TestApp>,
  );
  fireEvent.click(getByText('testButtonTitle'));
  fireEvent.click(getByText('testSubmit'));
  expect(defaultProps.onSubmit).toHaveBeenCalled();
});

test('disabling time does not allow schedule', () => {
  const {queryByText} = render(
    <TestApp>
      <SchedulerModal {...defaultProps} enableTime={false} />
    </TestApp>,
  );
  expect(queryByText('Date')).not.toBeInTheDocument();
  expect(queryByText('Frequency')).not.toBeInTheDocument();
});
