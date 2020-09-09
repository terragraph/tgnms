/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import SitePopupsLayer from '../SitePopupsLayer';
import {
  NetworkContextWrapper,
  TestApp,
  mockTopology,
} from '../../../../tests/testHelpers';
import {Popup} from 'react-mapbox-gl';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkConfig} from '../../../../tests/data/NetworkConfig';

afterEach(cleanup);

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
