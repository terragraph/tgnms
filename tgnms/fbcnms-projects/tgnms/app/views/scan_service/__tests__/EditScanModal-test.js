/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import * as scanServiceAPIUtil from '../../../apiutils/ScanServiceAPIUtil';
import EditScanModal from '../EditScanModal';
import {
  ScheduleNetworkTestModalWrapper,
  TestApp,
} from '../../../tests/testHelpers';
import {cleanup, fireEvent, render} from '@testing-library/react';

const editScanScheduleMock = jest
  .spyOn(scanServiceAPIUtil, 'editScanSchedule')
  .mockImplementation(() => Promise.resolve());

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('../../../hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(snackbarsMock);

afterEach(() => {
  cleanup();
});

const defaultProps = {
  onActionClick: jest.fn(),
  id: 1,
  type: 'IM',
  mode: 'FINE',
  initialCronString: '',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
});

test('Save Changes calls edit api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
  fireEvent.click(getByText('Save Changes'));
  expect(editScanScheduleMock).toHaveBeenCalled();
});

test('no adhoc should be available', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
  expect(queryByText('now')).not.toBeInTheDocument();
});
