/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import SiteDetailsNodeIcon from '../SiteDetailsNodeIcon';
import {
  NetworkContextWrapper,
  TestApp,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';
import {mockNetworkConfig, mockNode} from '../../../tests/data/NetworkConfig';

afterEach(cleanup);

test('renders without BGP', () => {
  const {queryByTestId} = render(<SiteDetailsNodeIcon />);
  expect(queryByTestId('routerIcon')).toBeInTheDocument();
  expect(queryByTestId('bgpStatusIcon')).not.toBeInTheDocument();
});

test('renders without BGP and with a selected node', () => {
  const {queryByTestId} = render(
    <SiteDetailsNodeIcon selectedNode={mockNode({mac_addr: 'test'})} />,
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
