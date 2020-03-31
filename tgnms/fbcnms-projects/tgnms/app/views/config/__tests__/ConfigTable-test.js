/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import ConfigTable from '../ConfigTable';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup} from '@testing-library/react';
import {renderWithRouter} from '../../../tests/testHelpers';

afterEach(cleanup);

const defaultProps = {
  data: [],
  onDraftChange: jest.fn(() => {}),
  selectedField: null,
  onSelectField: jest.fn(() => {}),
  hideDeprecatedFields: true,
};

test('renders without crashing', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Field')).toBeInTheDocument();
  expect(getByText('Status')).toBeInTheDocument();
});

test('renders table rows', async () => {
  const {getByText} = renderWithRouter(
    <TestApp>
      <ConfigTable
        {...defaultProps}
        data={[
          {
            field: ['test', 'test2'],
            hasOverride: false,
            hasTopLevelOverride: false,
            layers: [{id: 'Base value', value: null}],
            metadata: {action: 'RESTART_SQUIRE', desc: 'test', type: 'STRING'},
          },
        ]}
      />
    </TestApp>,
  );
  expect(getByText('Field')).toBeInTheDocument();
  expect(getByText('test.test2')).toBeInTheDocument();
  expect(getByText('unset')).toBeInTheDocument();
  expect(getByText('String')).toBeInTheDocument();
});
