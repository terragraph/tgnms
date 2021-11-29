/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import NetworkLinksTable from '../NetworkLinksTable';
import {FIG0, mockFig0} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {
  NetworkContextWrapper,
  TestApp,
  mockHardwareProfiles,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {Route} from 'react-router-dom';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {fireEvent, render, within} from '@testing-library/react';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {StatusReportType} from '@fbcnms/tg-nms/shared/types/Controller.js';

test('renders table with no data', () => {
  const {getByTestId} = render(
    <TestApp route="/nodes">
      <NetworkContextWrapper contextValue={{}}>
        <Route path="/" render={_r => <NetworkLinksTable />} />
      </NetworkContextWrapper>
    </TestApp>,
  );

  expect(getByTestId('network-links-table')).toBeInTheDocument();
});

test('renders table with data', () => {
  const {getByText, getByTestId} = render(
    <Wrapper>
      <Route path="/" render={_r => <NetworkLinksTable />} />
    </Wrapper>,
  );
  expect(getByTestId('network-links-table')).toBeInTheDocument();
  expect(getByText(FIG0.LINK1)).toBeInTheDocument();
});

test('beam-index mapping', () => {
  const node1Mac = 'ff:00:ff:00:ff';
  const node2Mac = 'ff:00:ff:00:aa';
  const topology = mockFig0();
  // these two nodes make up FIG0.LINK1
  topology.__test.updateNode(FIG0.NODE1_1, {mac_addr: node1Mac});
  topology.__test.updateNode(FIG0.NODE2_0, {mac_addr: node2Mac});
  const topologyMaps = buildTopologyMaps(topology);
  const {getByText, getByTestId} = render(
    <Wrapper
      contextValue={{
        networkConfig: mockNetworkConfig({
          topology: topology,
          status_dump: {
            timeStamp: 100,
            statusReports: {
              [node1Mac]: ({
                hardwareBoardId: 'PUMA',
              }: $Shape<StatusReportType>),
            },
          },
        }),
        ...topologyMaps,
        networkAnalyzerData: {
          [FIG0.LINK1]: {
            A: {
              avg_snr: '0',
              avg_mcs: '0',
              avg_tx_power: '0',
              flaps: '0',
              avg_per: '0',
              // corresponds with beam_angle_map in mockHardwareProfiles
              tx_beam_idx: '0',
              rx_beam_idx: '119',
            },
            Z: {
              avg_snr: '0',
              avg_mcs: '0',
              avg_tx_power: '0',
              flaps: '0',
              avg_per: '0',
              // corresponds with beam_angle_map in mockHardwareProfiles
              tx_beam_idx: '119',
              rx_beam_idx: '0',
            },
          },
        },
        hardwareProfiles: mockHardwareProfiles(),
      }}>
      <Route path="/" render={_r => <NetworkLinksTable />} />
    </Wrapper>,
  );
  // select the Link Stats table to show the beam indices
  fireEvent.click(getByText(/Link Stats/i));
  expect(
    within(getByTestId(`${FIG0.LINK1}-0`)).getByText('R 0'),
  ).toBeInTheDocument();
  expect(
    within(getByTestId(`${FIG0.LINK1}-0`)).getByText('L 44'),
  ).toBeInTheDocument();
  expect(
    within(getByTestId(`${FIG0.LINK1}-1`)).getByText('R 0'),
  ).toBeInTheDocument();
  expect(
    within(getByTestId(`${FIG0.LINK1}-1`)).getByText('R 45'),
  ).toBeInTheDocument();
});

type WrapperType = {
  children: React.Node,
  contextValue?: $Shape<NetworkContextType>,
};
function Wrapper({children, contextValue}: WrapperType) {
  const topology = mockFig0();
  const topologyMaps = buildTopologyMaps(topology);
  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          ...contextValue,
        }}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}
