/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import SiteDetails from '../SiteDetails';
import {TestApp} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TopologyBuilderContextProvider} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

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
        <SiteDetails />
      </TopologyBuilderContextProvider>
    </TestApp>,
  );
  expect(getByText('Site Location')).toBeInTheDocument();
});
