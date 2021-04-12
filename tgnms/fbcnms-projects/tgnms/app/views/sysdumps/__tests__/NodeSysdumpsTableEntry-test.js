/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NodeSysdumpsTableEntry from '../NodeSysdumpsTableEntry';
import React from 'react';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockSysdumpEntryData} from '@fbcnms/tg-nms/app/tests/data/Sysdumps';
import {render} from '@testing-library/react';

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
