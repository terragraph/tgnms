/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import AssetTestResultDetails from '../AssetTestResultDetails';
import MaterialTheme from '../../../MaterialTheme';
import React from 'react';
import {NetworkContextWrapper} from '../../../tests/testHelpers';
import {mockExecutionResult} from '../../../tests/data/NetworkTestApi';
import {mockLinkMapValue} from '../../../tests/data/NetworkContext';
import {render} from '@testing-library/react';

const defaultProps = {
  results: [mockExecutionResult()],
};

test('renders with with valid selected link', () => {
  const {getByText} = render(
    <NetworkContextWrapper
      contextValue={{
        linkMap: {
          testAssetName: mockLinkMapValue(),
        },
      }}>
      <MaterialTheme>
        <AssetTestResultDetails {...defaultProps} />
      </MaterialTheme>
    </NetworkContextWrapper>,
  );
  expect(getByText('EXCELLENT')).toBeInTheDocument();
  expect(getByText('Summary')).toBeInTheDocument();
  expect(getByText('Iperf Throughput')).toBeInTheDocument();
});
