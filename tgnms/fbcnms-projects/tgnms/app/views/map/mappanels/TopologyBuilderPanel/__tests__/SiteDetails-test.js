/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
