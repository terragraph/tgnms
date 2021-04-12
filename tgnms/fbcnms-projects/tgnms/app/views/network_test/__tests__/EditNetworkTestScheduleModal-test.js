/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import * as networkTestAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkTestAPIUtil';
import EditNetworkTestScheduleModal from '../EditNetworkTestScheduleModal';
import {
  ScheduleNetworkTestModalWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {fireEvent, render} from '@testing-library/react';

const editTestScheduleMock = jest
  .spyOn(networkTestAPIUtil, 'editTestSchedule')
  .mockImplementation(() => Promise.resolve());

const enqueueSnackbarMock = jest.fn();
jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useSnackbar'), 'useEnqueueSnackbar')
  .mockReturnValue(enqueueSnackbarMock);

const defaultProps = {
  onActionClick: jest.fn(),
  id: 1,
  type: 'sequential_link',
  initialOptions: {},
  initialCronString: '',
};

test('renders without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditNetworkTestScheduleModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
});

test('button click opens modal', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditNetworkTestScheduleModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Network Test Schedule')).toBeInTheDocument();
});

test('Save Changes calls edit api', () => {
  const {getByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditNetworkTestScheduleModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Network Test Schedule')).toBeInTheDocument();
  fireEvent.click(getByText('Save Changes'));
  expect(editTestScheduleMock).toHaveBeenCalled();
});

test('no adhoc should be available', () => {
  const {getByText, queryByText} = render(
    <TestApp>
      <ScheduleNetworkTestModalWrapper>
        <EditNetworkTestScheduleModal {...defaultProps} />
      </ScheduleNetworkTestModalWrapper>
    </TestApp>,
  );
  expect(getByText('Edit')).toBeInTheDocument();
  fireEvent.click(getByText('Edit'));
  expect(getByText('Edit Network Test Schedule')).toBeInTheDocument();
  expect(queryByText('now')).not.toBeInTheDocument();
});
