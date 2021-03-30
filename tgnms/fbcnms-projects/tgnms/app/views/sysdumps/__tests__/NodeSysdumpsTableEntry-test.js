/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import NodeSysdumpsTableEntry from '../NodeSysdumpsTableEntry';
import React from 'react';
import {TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockSysdumpEntryData} from '../../../tests/data/Sysdumps';

afterEach(cleanup);

const defaultProps = {
  sysdump: mockSysdumpEntryData(),
  onClick: jest.fn(() => {}),
  isSelected: false,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp>
      <NodeSysdumpsTableEntry {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('testFilename')).toBeInTheDocument();
  expect(getByText('testDate')).toBeInTheDocument();
  expect(getByText('123')).toBeInTheDocument();
});
