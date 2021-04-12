/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as networkTestAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import ScheduleNetworkTestModal from '../ScheduleNetworkTestModal';
import {
  ScheduleNetworkTestModalWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const startExecutionMock = jest
  .spyOn(networkTestAPIUtil, 'startExecution')
  .mockImplementation(() => Promise.resolve());

const scheduleTestMock = jest
  .spyOn(networkTestAPIUtil, 'scheduleTest')
  .mockImplementation(() => Promise.resolve());

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(snackbarsMock);

const defaultProps = {
  onActionClick: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleNetworkTestModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Network Test')).toBeInTheDocument();
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleNetworkTestModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Network Test')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Network Test'));
  expect(getByText('Start Test')).toBeInTheDocument();
  expect(getByText('Type')).toBeInTheDocument();
});

test('Start Execution calls startExecution api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleNetworkTestModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Network Test')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Network Test'));
  expect(getByText('Start Test')).toBeInTheDocument();
  fireEvent.click(getByText('Start Test'));
  expect(startExecutionMock).toHaveBeenCalled();
});

test('schedule click calls schedule api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleNetworkTestModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Network Test')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Network Test'));
  fireEvent.click(getByText('later'));
  fireEvent.click(getByText('Schedule Test'));
  expect(scheduleTestMock).toHaveBeenCalled();
});
