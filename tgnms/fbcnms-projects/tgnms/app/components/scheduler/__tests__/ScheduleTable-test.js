/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import MaterialTheme from '../../../MaterialTheme';
import ScheduleTable from '../ScheduleTable';
import {SCHEDULE_TABLE_TYPES} from '../../../constants/ScheduleConstants';
import {SnackbarWrapper} from '../../../tests/testHelpers';
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

function Wrapper({children}: {children: React.Node}) {
  return (
    <SnackbarWrapper>
      <MaterialTheme>{children}</MaterialTheme>
    </SnackbarWrapper>
  );
}
