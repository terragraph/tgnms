/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import CorrelationVisualization from '../CorrelationVisualization';
import React from 'react';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TIME_OPTIONS} from '../RootCause';
import {mockNetworkContext} from '@fbcnms/tg-nms/app/tests/data/NetworkContext';
import {render} from '@testing-library/react';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/contexts/NetworkContext'),
    'useNetworkContext',
  )
  .mockImplementation(jest.fn(() => mockNetworkContext()));

const defaultProps = {selectedNodeName: '', timeOffset: TIME_OPTIONS.DAY};

test('renders', () => {
  const {getByText, getAllByText} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper>
        <CorrelationVisualization {...defaultProps} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByText('Timeline')).toBeInTheDocument();
  expect(getAllByText('Availability')[0]).toBeInTheDocument();
});
