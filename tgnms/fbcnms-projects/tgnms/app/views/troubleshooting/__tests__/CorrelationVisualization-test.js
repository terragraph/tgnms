/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
