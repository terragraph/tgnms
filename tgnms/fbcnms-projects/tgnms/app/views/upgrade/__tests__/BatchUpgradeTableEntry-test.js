/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import BatchUpgradeTableEntry from '../BatchUpgradeTableEntry';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockBatchData} from '../../../tests/data/Upgrade';

afterEach(cleanup);

const defaultProps = {
  batch: mockBatchData(),
};

test('renders with no upgradeStatus, upgrade, version, or next version', () => {
  const {getByText, getAllByText} = render(
    <TestApp>
      <BatchUpgradeTableEntry {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('test1')).toBeInTheDocument();
  expect(getAllByText('Not Available')[0]).toBeInTheDocument();
  expect(getAllByText('Not Available').length).toBe(2);
});

test('renders with all properties', () => {
  const {getByText} = render(
    <TestApp>
      <BatchUpgradeTableEntry
        batch={mockBatchData({
          upgradeStatus: 'testUpgradeStatus',
          upgradeReqId: 'testUpgradeId',
          version: '1.2',
          nextVersion: '1.3',
        })}
      />
    </TestApp>,
  );
  expect(getByText('test1')).toBeInTheDocument();
  expect(getByText('testUpgradeStatus')).toBeInTheDocument();
  expect(getByText('testUpgradeId')).toBeInTheDocument();
  expect(getByText('1.2')).toBeInTheDocument();
  expect(getByText('1.3')).toBeInTheDocument();
});
