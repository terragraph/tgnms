/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import LinkDetails from '../LinkDetails';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TopologyBuilderContextProvider} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {fireEvent, render} from '@testing-library/react';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';

jest.mock('@fbcnms/tg-nms/app/contexts/NetworkContext', () => ({
  useNetworkContext: () => ({
    networkName: 'testNetwork',
    networkConfig: mockNetworkConfig(),
  }),
}));

test('render without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <TopologyBuilderContextProvider>
        <LinkDetails />
      </TopologyBuilderContextProvider>
    </TestApp>,
  );
  expect(getByText('+ Add Link')).toBeInTheDocument();
});

test('add link adds a link form', () => {
  const {getByText, getByLabelText} = render(
    <TestApp>
      <TopologyBuilderContextProvider>
        <LinkDetails />
      </TopologyBuilderContextProvider>
    </TestApp>,
  );
  fireEvent.click(getByText('+ Add Link'));
  expect(getByLabelText('From Node')).toBeInTheDocument();
});
