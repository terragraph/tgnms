/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import MaterialTheme from '../../../MaterialTheme';
import ScheduleTable from '../ScheduleTable';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

const historyMock = jest.fn();

const defaultProps = {
  schedulerModal: <div>schedulerModal</div>,
  createURL: jest.fn(),
  rows: [],
  loading: false,
  tableOptions: {onOptionsUpdate: jest.fn(), optionsInput: []},
};

test('renders without crashing', () => {
  const {getByText} = render(
    <MaterialTheme>
      <ScheduleTable history={historyMock()} {...defaultProps} />
    </MaterialTheme>,
  );
  expect(getByText('schedulerModal')).toBeInTheDocument();
});

test('renders loading', () => {
  const {getByTestId} = render(
    <MaterialTheme>
      <ScheduleTable {...defaultProps} history={historyMock()} loading={true} />
    </MaterialTheme>,
  );
  expect(getByTestId('loading-box')).toBeInTheDocument();
});

test('renders empty message when no rows', () => {
  const {getByText} = render(
    <MaterialTheme>
      <ScheduleTable {...defaultProps} history={historyMock()} />
    </MaterialTheme>,
  );
  expect(
    getByText(
      'No executions or schedules with current filters, try starting a test.',
    ),
  ).toBeInTheDocument();
});

test('renders custom table with rows', () => {
  render(
    <MaterialTheme>
      <ScheduleTable
        {...defaultProps}
        history={historyMock()}
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
    </MaterialTheme>,
  );
  const table = document.getElementsByClassName('CustomTable__BodyGrid');
  expect(table);
});
