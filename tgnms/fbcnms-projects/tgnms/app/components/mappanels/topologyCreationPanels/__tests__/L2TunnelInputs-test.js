/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import L2TunnelInputs from '../L2TunnelInputs';
import React from 'react';
import {NetworkContextWrapper, TestApp} from '../../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

afterEach(cleanup);

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <NetworkContextWrapper>
        <L2TunnelInputs />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Node 1 *')).toBeInTheDocument();
});
