/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import NodeUpgradeTableEntry from '../NodeUpgradeTableEntry';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockStructuredNodeData} from '../../../tests/data/Upgrade';

afterEach(cleanup);

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
