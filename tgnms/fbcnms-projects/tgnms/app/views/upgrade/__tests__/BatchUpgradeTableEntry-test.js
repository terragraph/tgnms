/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import BatchUpgradeTableEntry from '../BatchUpgradeTableEntry';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockBatchData} from '@fbcnms/tg-nms/app/tests/data/Upgrade';
import {render} from '@testing-library/react';

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
