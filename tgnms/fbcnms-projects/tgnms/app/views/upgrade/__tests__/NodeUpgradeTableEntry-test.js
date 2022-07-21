/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import NodeUpgradeTableEntry from '../NodeUpgradeTableEntry';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockStructuredNodeData} from '@fbcnms/tg-nms/app/tests/data/Upgrade';
import {render} from '@testing-library/react';

const defaultProps = {
  node: mockStructuredNodeData(),
  onClick: jest.fn(() => {}),
  isSelected: false,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <NodeUpgradeTableEntry {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testName')).toBeInTheDocument();
  expect(getByText('testSite')).toBeInTheDocument();
  expect(getByText('testStatus')).toBeInTheDocument();
  expect(getByText('testReason')).toBeInTheDocument();
  expect(getByText('testVersionNext')).toBeInTheDocument();
});
