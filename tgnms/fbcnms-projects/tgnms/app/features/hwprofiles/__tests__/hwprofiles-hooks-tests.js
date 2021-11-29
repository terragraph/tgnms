/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import {
  FIG0,
  NetworkContextWrapper,
  TestApp,
  mockFig0,
  mockNetworkConfig,
  mockStatusReport,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {renderHook} from '@testing-library/react-hooks';
import {useHardwareProfiles} from '@fbcnms/tg-nms/app/features/hwprofiles/hooks';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const MOCK_HWBOARDID = 'test';
test('gets profile for a given node', () => {
  const topology = mockFig0();
  const MAC1 = 'mac1';
  const MAC2 = 'mac2';
  topology.__test.updateNode(FIG0.NODE1_0, {
    mac_addr: MAC1,
  });
  topology.__test.updateNode(FIG0.NODE2_0, {
    mac_addr: MAC2,
  });
  const topologyMaps = buildTopologyMaps(topology);
  const {result} = renderHook(() => useHardwareProfiles(), {
    wrapper: props => (
      <Wrapper
        {...props}
        networkContext={{
          networkConfig: mockNetworkConfig({
            topology,
            status_dump: {
              statusReports: {
                [MAC1]: mockStatusReport({hardwareBoardId: MOCK_HWBOARDID}),
                [MAC2]: mockStatusReport({hardwareBoardId: MOCK_HWBOARDID}),
              },
              timeStamp: 0,
            },
          }),
          ...topologyMaps,
          hardwareProfiles: {
            default: loadDefaultProfileJson(),
            test: {...loadDefaultProfileJson(), hwBoardId: 'test'},
          },
        }}
      />
    ),
  });
  const node1Profile = result.current.getProfileByNodeName(FIG0.NODE1_0);
  const node2Profile = result.current.getProfileByNodeName(FIG0.NODE2_0);
  expect(node1Profile).toMatchObject({
    hwBoardId: MOCK_HWBOARDID,
  });
  expect(node2Profile).toMatchObject({
    hwBoardId: MOCK_HWBOARDID,
  });
});

test('falls back to the default if boardid is unknown', () => {
  const topology = mockFig0();
  const MAC1 = 'mac1';
  const MAC2 = 'mac2';
  topology.__test.updateNode(FIG0.NODE1_0, {
    mac_addr: MAC1,
  });
  topology.__test.updateNode(FIG0.NODE2_0, {
    mac_addr: MAC2,
  });
  const topologyMaps = buildTopologyMaps(topology);
  const {result} = renderHook(() => useHardwareProfiles(), {
    wrapper: props => (
      <Wrapper
        {...props}
        networkContext={{
          networkConfig: mockNetworkConfig({
            topology,
            status_dump: {
              statusReports: {},
              timeStamp: 0,
            },
          }),
          ...topologyMaps,
          hardwareProfiles: {
            default: loadDefaultProfileJson(),
            test: loadDefaultProfileJson(),
          },
        }}
      />
    ),
  });
  const node1Profile = result.current.getProfileByNodeName(FIG0.NODE1_0);
  const node2Profile = result.current.getProfileByNodeName(FIG0.NODE2_0);
  expect(node1Profile).toMatchObject({
    hwBoardId: 'default',
  });
  expect(node2Profile).toMatchObject({
    hwBoardId: 'default',
  });
});

function Wrapper({
  children,
  networkContext,
}: {
  children: React.Node,
  networkContext?: $Shape<NetworkContextType>,
}) {
  return (
    <TestApp>
      <NetworkContextWrapper contextValue={networkContext}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}

function loadDefaultProfileJson() {
  // nms_stack/nms_cli/nms_stack/roles/hwprofiles/files
  const relativeSrcPath =
    '../../../../../../../../nms_stack/nms_cli/nms_stack/roles/hwprofiles/files';
  const fs = require('fs');
  const path = require('path');
  const dir = path.resolve(__filename, relativeSrcPath);
  const defaultProfilePath = path.resolve(dir, 'profiles/default.json');
  const profileJson = fs.readFileSync(defaultProfilePath, {encoding: 'utf-8'});
  return JSON.parse(profileJson);
}
