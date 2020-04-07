/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import SchedulerModal from '../SchedulerModal';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

afterEach(cleanup);

const defaultProps = {
  buttonTitle: 'testButtonTitle',
  modalTitle: 'testModalTitle',
  modalSubmitText: 'testSubmit',
  handleSubmit: jest.fn(),
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
  expect(defaultProps.handleSubmit).toHaveBeenCalled();
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
