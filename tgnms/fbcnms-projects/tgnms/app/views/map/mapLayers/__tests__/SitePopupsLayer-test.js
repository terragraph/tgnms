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
import SitePopupsLayer from '../SitePopupsLayer';
import {
  NetworkContextWrapper,
  TestApp,
  mockTopology,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Popup} from 'react-mapbox-gl';
import {mockNetworkConfig} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

test('renders with default props', () => {
  const topology = mockTopology();
  topology.__test.addSite({
    name: 'site1',
    location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
  });

  render(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkName: 'testNetworkName',
          siteMap: {
            site1: {
              name: 'site1',
              location: {latitude: 1, longitude: 1, accuracy: 1, altitude: 1},
            },
          },
          networkConfig: mockNetworkConfig({topology}),
        }}>
        <SitePopupsLayer />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(Popup).toHaveBeenCalled();
});
