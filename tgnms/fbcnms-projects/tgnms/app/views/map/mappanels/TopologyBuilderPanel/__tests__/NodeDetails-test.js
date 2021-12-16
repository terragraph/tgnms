/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NodeDetails from '../NodeDetails';
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
        <NodeDetails />
      </TopologyBuilderContextProvider>
    </TestApp>,
  );
  expect(getByText('+ Add Node')).toBeInTheDocument();
});

test('add node adds a link form', () => {
  const {getByText, getByLabelText} = render(
    <TestApp>
      <TopologyBuilderContextProvider>
        <NodeDetails />
      </TopologyBuilderContextProvider>
    </TestApp>,
  );
  fireEvent.click(getByText('+ Add Node'));
  expect(getByLabelText('Node Name')).toBeInTheDocument();
});
