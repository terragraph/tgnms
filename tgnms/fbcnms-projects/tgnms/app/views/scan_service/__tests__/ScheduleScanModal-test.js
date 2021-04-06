/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as scanServiceAPIUtil from '../../../apiutils/ScanServiceAPIUtil';
import ScheduleScanModal from '../ScheduleScanModal';
import {
  ScheduleNetworkTestModalWrapper,
  TestApp,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

const startExecutionMock = jest
  .spyOn(scanServiceAPIUtil, 'startExecution')
  .mockImplementation(() => Promise.resolve());

const scheduleTestMock = jest
  .spyOn(scanServiceAPIUtil, 'scheduleScan')
  .mockImplementation(() => Promise.resolve());

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('../../../hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

afterEach(() => {
  cleanup();
});

const defaultProps = {
  onActionClick: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Scan'));
  expect(getByText('Start Scan')).toBeInTheDocument();
  expect(getByText('Type')).toBeInTheDocument();
});

test('Start Execution calls startExecution api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Scan'));
  expect(getByText('Start Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Start Scan'));
  expect(startExecutionMock).toHaveBeenCalled();
});

test('schedule click calls schedule api', () => {
  const {getByText, getAllByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Scan'));
  fireEvent.click(getByText('later'));
  fireEvent.click(getAllByText('Schedule Scan').pop());
  expect(scheduleTestMock).toHaveBeenCalled();
});
