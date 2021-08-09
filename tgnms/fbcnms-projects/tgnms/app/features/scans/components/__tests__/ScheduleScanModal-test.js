/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as scanServiceAPIUtil from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import ScheduleScanModal from '../ScheduleScanModal';
import {
  ScheduleModalWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  coerceClass,
  mockNode,
  selectAutocompleteItem,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render, within} from '@testing-library/react';

const startExecutionMock = jest
  .spyOn(scanServiceAPIUtil, 'startExecution')
  .mockImplementation(() => Promise.resolve());

const scheduleTestMock = jest
  .spyOn(scanServiceAPIUtil, 'scheduleScan')
  .mockImplementation(() => Promise.resolve());

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

const defaultProps = {
  onActionClick: jest.fn(),
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
});

test('can select a radio to run scan on', () => {
  const {getByText, getByTestId} = render(
    <TestApp>
      <ScheduleModalWrapper
        contextValue={{
          networkName: 'MyNetwork',
          nodeMap: {
            testNode: mockNode({
              name: 'MyNode',
              site_name: 'MySite',
              wlan_mac_addrs: ['aa:aa:aa:aa:aa'],
            }),
          },
        }}>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Scan'));

  const autocomplete = within(getByTestId('autocomplete')).getByRole('textbox');

  expect(coerceClass(autocomplete, HTMLInputElement).value).toEqual(
    'MyNetwork',
  );
  // perform selection
  selectAutocompleteItem(autocomplete, 'aa:aa:aa:aa:aa');

  expect(getByText('Start Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Start Scan'));
  expect(startExecutionMock).toHaveBeenCalledWith({
    type: 2,
    networkName: 'MyNetwork',
    mode: 2,
    options: {tx_wlan_mac: 'aa:aa:aa:aa:aa'},
  });
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleModalWrapper>
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
      <ScheduleModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleModalWrapper>
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
      <ScheduleModalWrapper>
        <ScheduleScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText('Schedule Scan')).toBeInTheDocument();
  fireEvent.click(getByText('Schedule Scan'));
  fireEvent.click(getByText('later'));
  fireEvent.click(getAllByText('Schedule Scan').pop());
  expect(scheduleTestMock).toHaveBeenCalled();
});
