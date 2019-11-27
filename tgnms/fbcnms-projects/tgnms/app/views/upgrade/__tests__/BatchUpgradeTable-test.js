/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import BatchUpgradeTable from '../BatchUpgradeTable';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockBatchArrayData} from '../../../tests/data/Upgrade';

afterEach(cleanup);

const defaultProps = {
  data: mockBatchArrayData(),
  title: 'testTitle',
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <BatchUpgradeTable {...defaultProps} data={[]} />
    </TestApp>,
  );
  expect(getByText('testTitle (0)')).toBeInTheDocument();
  expect(getByText('There is no data to display')).toBeInTheDocument();
});

test('renders nodes and titles', () => {
  const {getByText} = render(
    <TestApp>
      <BatchUpgradeTable {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testTitle (3)')).toBeInTheDocument();
  expect(getByText('test1')).toBeInTheDocument();
  expect(getByText('Name')).toBeInTheDocument();
  expect(getByText('Next Image Version')).toBeInTheDocument();
});
