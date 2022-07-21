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
import MaterialTheme from '@fbcnms/tg-nms/app/MaterialTheme';
import ScheduleTable from '../ScheduleTable';
import {SCHEDULE_TABLE_TYPES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {SnackbarWrapper} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {render} from '@testing-library/react';

jest.mock('react-router', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

const defaultProps = {
  schedulerModal: <div>schedulerModal</div>,
  createURL: jest.fn(),
  rows: [],
  loading: false,
  tableOptions: {onOptionsUpdate: jest.fn(), optionsInput: []},
  mode: SCHEDULE_TABLE_TYPES.TEST,
};

test('renders without crashing', () => {
  const {getByText} = render(
    <Wrapper>
      <ScheduleTable {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('schedulerModal')).toBeInTheDocument();
});

test('renders loading', () => {
  const {getByTestId} = render(
    <Wrapper>
      <ScheduleTable {...defaultProps} loading={true} />
    </Wrapper>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders empty message when no rows', () => {
  const {getByText} = render(
    <Wrapper>
      <ScheduleTable {...defaultProps} />
    </Wrapper>,
  );
  expect(getByText('No tests found')).toBeInTheDocument();
});

test('renders custom table with rows', () => {
  render(
    <Wrapper>
      <ScheduleTable
        {...defaultProps}
        rows={[
          {
            id: 1,
            rowId: '0',
            filterStatus: 'FINISHED',
            type: 'sequential',
            start: new Date().toLocaleString(),
            status: null,
            protocol: 'UDP',
            actions: null,
          },
        ]}
      />
    </Wrapper>,
  );
  const table = document.getElementsByClassName('CustomTable__BodyGrid');
  expect(table);
});

test('renders scan table with Item column', () => {
  const props = {
    ...defaultProps,
    mode: SCHEDULE_TABLE_TYPES.SCAN,
  };
  const {getByText} = render(
    <Wrapper>
      <ScheduleTable
        {...props}
        rows={[
          {
            id: 1,
            item: 'Site: ff:ff:ff:ff:ff',
            rowId: '0',
            filterStatus: 'FINISHED',
            type: 'IM',
            start: new Date().toLocaleString(),
            status: null,
            mode: 'FINE',
            actions: null,
          },
        ]}
      />
    </Wrapper>,
  );
  expect(getByText('item'));
  expect(getByText('Site: ff:ff:ff:ff:ff'));
});

function Wrapper({children}: {children: React.Node}) {
  return (
    <SnackbarWrapper>
      <MaterialTheme>{children}</MaterialTheme>
    </SnackbarWrapper>
  );
}
