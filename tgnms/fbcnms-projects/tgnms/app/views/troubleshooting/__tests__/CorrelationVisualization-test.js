/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import 'jest-dom/extend-expect';
import CorrelationVisualization from '../CorrelationVisualization';
import React from 'react';
import {NetworkContextWrapper, TestApp} from '../../../tests/testHelpers';
import {TIME_OPTIONS} from '../RootCause';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkContext} from '../../../tests/data/NetworkContext';

jest
  .spyOn(require('../../../contexts/NetworkContext'), 'useNetworkContext')
  .mockImplementation(jest.fn(() => mockNetworkContext()));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

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
