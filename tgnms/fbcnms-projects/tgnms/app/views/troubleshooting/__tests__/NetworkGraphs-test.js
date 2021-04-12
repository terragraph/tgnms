/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import NetworkGraphs from '../NetworkGraphs';
import React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {mockNetworkContext} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/NetworkContext'),
    'useNetworkContext',
  )
  .mockImplementation(jest.fn(() => mockNetworkContext()));

const defaultProps = {
  data: null,
  startTime: 0,
  endTime: 1,
};

test('renders', () => {
  const {getByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <NetworkGraphs {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByText('Network')).toBeInTheDocument();
  expect(getByText('Link Availability')).toBeInTheDocument();
  expect(getByText('Node Availability')).toBeInTheDocument();
});
