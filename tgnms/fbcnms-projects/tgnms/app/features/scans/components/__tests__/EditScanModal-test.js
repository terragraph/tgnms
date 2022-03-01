/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as scanServiceAPIUtil from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import EditScanModal from '../EditScanModal';
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

const editScanScheduleMock = jest
  .spyOn(scanServiceAPIUtil, 'editScanSchedule')
  .mockImplementation(() => Promise.resolve());

const snackbarsMock = {error: jest.fn(), success: jest.fn()};
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(snackbarsMock);

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
      <ScheduleModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText(/edit/i)).toBeInTheDocument();
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText(/edit/i)).toBeInTheDocument();
  fireEvent.click(getByText(/edit/i));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
});

test('Save Changes calls edit api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText(/edit/i)).toBeInTheDocument();
  fireEvent.click(getByText(/edit/i));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
  fireEvent.click(getByText('Save Changes'));
  expect(editScanScheduleMock).toHaveBeenCalled();
});

test('no adhoc should be available', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ScheduleModalWrapper>
        <EditScanModal {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText(/edit/i)).toBeInTheDocument();
  fireEvent.click(getByText(/edit/i));
  expect(getByText('Edit Scan Schedule')).toBeInTheDocument();
  expect(queryByText('now')).not.toBeInTheDocument();
});

test('can select a network to run scan on', () => {
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
          macToNodeMap: {
            'aa:aa:aa:aa:aa': 'testNode',
          },
        }}>
        <EditScanModal tx_wlan_mac={'aa:aa:aa:aa:aa'} {...defaultProps} />
      </ScheduleModalWrapper>
    </TestApp>,
  );
  expect(getByText(/edit/i)).toBeInTheDocument();
  fireEvent.click(getByText(/edit/i));

  const autocomplete = within(getByTestId('autocomplete')).getByRole('textbox');

  expect(coerceClass(autocomplete, HTMLInputElement).value).toEqual(
    'aa:aa:aa:aa:aa',
  );

  // perform selection
  selectAutocompleteItem(autocomplete, 'MyNetwork');

  expect(getByText('Save Changes')).toBeInTheDocument();
  fireEvent.click(getByText('Save Changes'));
  expect(editScanScheduleMock).toHaveBeenCalledWith({
    inputData: {
      cronExpr: expect.anything(),
      networkName: 'MyNetwork',
      type: 2,
      mode: 2,
      options: {},
    },
    scheduleId: 1,
  });
});
