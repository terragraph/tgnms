/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import SiteDetailsNodeIcon from '../SiteDetailsNodeIcon';
import {
  NetworkContextWrapper,
  TestApp,
  renderWithRouter,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  mockNetworkConfig,
  mockNode,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {render} from '@testing-library/react';

jest
  .spyOn(require('@fbcnms/tg-nms/app/hooks/useNodeConfig'), 'useNodeConfig')
  .mockReturnValue({
    loading: false,
    configData: [{field: ['test', 'param']}],
    configParams: {
      nodeOverridesConfig: {tunnel: {tunnelConfig: {}}},
      networkOverridesConfig: {},
    },
  });

test('renders without BGP', () => {
  const {queryByTestId} = render(
    <TestApp>
      <SiteDetailsNodeIcon />
    </TestApp>,
  );
  expect(queryByTestId('routerIcon')).toBeInTheDocument();
  expect(queryByTestId('bgpStatusIcon')).not.toBeInTheDocument();
});

test('renders without BGP and with a selected node', () => {
  const {queryByTestId} = render(
    <TestApp>
      <SiteDetailsNodeIcon selectedNode={mockNode({mac_addr: 'test'})} />
    </TestApp>,
  );
  expect(queryByTestId('routerIcon')).toBeInTheDocument();
  expect(queryByTestId('bgpStatusIcon')).not.toBeInTheDocument();
});

test('renders with BGP', () => {
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({
            status_dump: {
              statusReports: {
                test: {
                  timeStamp: 0,
                  ipv6Address: '',
                  version: '',
                  ubootVersion: '',
                  status: 'ONLINE',
                  upgradeStatus: {
                    usType: 'NONE',
                    nextImage: {md5: '', version: ''},
                    reason: '',
                    upgradeReqId: '',
                    whenToCommit: 0,
                  },
                  configMd5: '',
                  bgpStatus: {},
                },
              },
              timeStamp: 0,
            },
          }),
        }}>
        <SiteDetailsNodeIcon selectedNode={mockNode({mac_addr: 'test'})} />
      </NetworkContextWrapper>
    </TestApp>,
  );
  expect(getByTestId('bgpStatusIcon')).toBeInTheDocument();
});

test('renders with Tunnel', () => {
  const {getByTestId} = renderWithRouter(
    <TestApp>
      <SiteDetailsNodeIcon selectedNode={mockNode({name: 'tunnel'})} />
    </TestApp>,
  );
  expect(getByTestId('tunnelConfigIcon')).toBeInTheDocument();
});
