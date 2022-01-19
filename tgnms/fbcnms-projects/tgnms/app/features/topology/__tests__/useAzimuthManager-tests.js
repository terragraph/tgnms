/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as serviceAPIUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  FIG0,
  mockFig0,
  mockLink,
  mockNetworkConfig,
} from '@fbcnms/tg-nms/app/tests/data/NetworkConfig';
import {
  NetworkContextWrapper,
  TestApp,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, renderHook} from '@testing-library/react-hooks';
import {
  buildTopologyMaps,
  getEstimatedNodeAzimuth,
  makeLinkName,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {useAzimuthManager} from '../useAzimuthManager';
jest.mock('@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil');

const apiRequestMock = jest
  .spyOn(serviceAPIUtil, 'apiRequest')
  .mockResolvedValue({success: true});

describe('deleteLink', () => {
  test('sends an APIService request for each node', async () => {
    const topology = mockFig0();
    const topologyMaps = buildTopologyMaps(topology);
    const nodeA = topologyMaps.nodeMap[FIG0.NODE1_1];
    const nodeZ = topologyMaps.nodeMap[FIG0.NODE2_0];
    topology.__test.updateNode(nodeA.name, {
      ant_azimuth: getEstimatedNodeAzimuth(nodeA, topologyMaps) ?? 0,
    });
    topology.__test.updateNode(nodeZ.name, {
      ant_azimuth: getEstimatedNodeAzimuth(nodeZ, topologyMaps) ?? 0,
    });
    const linkToDelete = topology.links.find(link => link.name === FIG0.LINK1);
    if (linkToDelete == null) {
      throw new Error(`couldn't find link ${FIG0.LINK1}`);
    }
    const {result} = renderHook(() => useAzimuthManager(), {
      wrapper: props => (
        <TestWrapper
          {...props}
          networkContext={{
            networkName: 'test',
            networkConfig: mockNetworkConfig({topology}),
            ...topologyMaps,
          }}
        />
      ),
    });
    await act(async () => {
      await result.current.deleteLink(linkToDelete);
    });

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(apiRequestMock).toHaveBeenCalledWith({
      networkName: 'test',
      endpoint: 'editNode',
      data: {
        nodeName: FIG0.NODE1_1,
        newNode: {
          ...topology.nodes.find(x => x.name === FIG0.NODE1_1),
          ant_azimuth: expect.any(Number),
        },
      },
    });
    expect(apiRequestMock).toHaveBeenCalledWith({
      networkName: 'test',
      endpoint: 'editNode',
      data: {
        nodeName: FIG0.NODE2_0,
        newNode: {
          ...topology.nodes.find(x => x.name === FIG0.NODE2_0),
          ant_azimuth: expect.any(Number),
        },
      },
    });
  });
});
describe('addLink', () => {
  test('sends an APIService request for each node', async () => {
    const topology = mockFig0();
    const link = mockLink({
      name: makeLinkName(FIG0.NODE1_0, FIG0.NODE3_0),
      a_node_name: FIG0.NODE1_0,
      z_node_name: FIG0.NODE3_0,
    });
    const {result} = renderHook(() => useAzimuthManager(), {
      wrapper: props => (
        <TestWrapper
          {...props}
          networkContext={{
            networkName: 'test',
            networkConfig: mockNetworkConfig({topology}),
            ...buildTopologyMaps(topology),
          }}
        />
      ),
    });
    await act(async () => {
      await result.current.addLink(link);
    });
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(apiRequestMock).toHaveBeenCalledWith({
      networkName: 'test',
      endpoint: 'editNode',
      data: {
        nodeName: FIG0.NODE1_0,
        newNode: {
          ...topology.nodes.find(x => x.name === FIG0.NODE1_0),
          ant_azimuth: expect.any(Number),
        },
      },
    });
    expect(apiRequestMock).toHaveBeenCalledWith({
      networkName: 'test',
      endpoint: 'editNode',
      data: {
        nodeName: FIG0.NODE3_0,
        newNode: {
          ...topology.nodes.find(x => x.name === FIG0.NODE3_0),
          ant_azimuth: expect.any(Number),
        },
      },
    });
  });
  test('doesnt send an APIService request if a node azimuth is too similar', async () => {
    const topology = mockFig0();
    const aNodeName = FIG0.NODE1_1;
    const zNodeName = FIG0.NODE2_0;
    /**
     * first, build the topology maps with the link still in it. Then
     * set the azimuths for both sides of the link. Then delete the link,
     * then call addLink and ensure that since they'll be the same,
     * no api requests are made.
     */
    const tempTopologyMaps = buildTopologyMaps(topology);
    const nodeA = topology.nodes.find(x => x.name === aNodeName);
    if (nodeA == null) {
      throw new Error(aNodeName + ' not found in topolog');
    }
    const aUpdate = {
      ant_azimuth: getEstimatedNodeAzimuth(nodeA, tempTopologyMaps) ?? 0,
    };
    topology.__test.updateNode(aNodeName, aUpdate);
    const nodeZ = topology.nodes.find(x => x.name === zNodeName);
    if (nodeZ == null) {
      throw new Error(zNodeName + ' not found in topolog');
    }
    const zUpdate = {
      ant_azimuth: getEstimatedNodeAzimuth(nodeZ, tempTopologyMaps) ?? 0,
    };
    topology.__test.updateNode(zNodeName, zUpdate);
    // delete the link from the topology
    topology.links = topology.links.filter(link => link.name != FIG0.LINK1);
    // then build the topology maps
    const topologyMaps = buildTopologyMaps(topology);
    const link = mockLink({
      name: FIG0.LINK1,
      a_node_name: aNodeName,
      z_node_name: zNodeName,
    });
    const {result} = renderHook(() => useAzimuthManager(), {
      wrapper: props => (
        <TestWrapper
          {...props}
          networkContext={{
            networkName: 'test',
            networkConfig: mockNetworkConfig({topology}),
            ...topologyMaps,
          }}
        />
      ),
    });
    await act(async () => {
      await result.current.addLink(link);
    });
    expect(apiRequestMock).toHaveBeenCalledTimes(0);
  });
});

describe('moveSite', () => {
  test(
    'when a site is moved, update all azimuths of nodes on the site' +
      ' and their peers',
    async () => {
      const topology = mockFig0();
      const topologyMaps = buildTopologyMaps(topology);
      const siteName = FIG0.SITE1;
      // wireless nodes/peers as defined in mockFig0
      const siteNodes = [FIG0.NODE1_0, FIG0.NODE1_1];
      const sitePeers = [FIG0.NODE2_0, FIG0.NODE4_1];
      // compute azimuths for all nodes
      for (const node of topology.nodes) {
        node.ant_azimuth = getEstimatedNodeAzimuth(node, topologyMaps) ?? 0;
      }
      const site = topologyMaps.siteMap[siteName];
      site.location = {
        latitude: 4,
        longitude: 4,
        altitude: 1,
        accuracy: 1,
      };

      const {result} = renderHook(() => useAzimuthManager(), {
        wrapper: props => (
          <TestWrapper
            {...props}
            networkContext={{
              networkName: 'test',
              networkConfig: mockNetworkConfig({topology}),
              ...topologyMaps,
            }}
          />
        ),
      });
      await act(async () => {
        await result.current.moveSite({
          siteName: siteName,
          newSite: site,
        });
      });
      expect(apiRequestMock).toHaveBeenCalledTimes(4);
      for (const nodeName of siteNodes.concat(sitePeers)) {
        expect(apiRequestMock).toHaveBeenCalledWith({
          networkName: 'test',
          endpoint: 'editNode',
          data: {
            nodeName,
            newNode: {
              ...topology.nodes.find(x => x.name === nodeName),
              ant_azimuth: expect.any(Number),
            },
          },
        });
      }
    },
  );
});

describe('deleteSite', () => {
  test('sends a request to recompute each affected node', async () => {
    const topology = mockFig0();
    const topologyMaps = buildTopologyMaps(topology);
    const nodeA = topologyMaps.nodeMap[FIG0.NODE1_1];
    const nodeZ = topologyMaps.nodeMap[FIG0.NODE2_0];
    topology.__test.updateNode(nodeA.name, {
      ant_azimuth: getEstimatedNodeAzimuth(nodeA, topologyMaps) ?? 0,
    });
    topology.__test.updateNode(nodeZ.name, {
      ant_azimuth: getEstimatedNodeAzimuth(nodeZ, topologyMaps) ?? 0,
    });

    // Get the site to delete.
    const {result} = renderHook(() => useAzimuthManager(), {
      wrapper: props => (
        <TestWrapper
          {...props}
          networkContext={{
            networkName: 'test',
            networkConfig: mockNetworkConfig({topology}),
            ...topologyMaps,
          }}
        />
      ),
    });
    await act(async () => {
      await result.current.deleteSite({siteName: nodeA.site_name});
    });

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledWith({
      networkName: 'test',
      endpoint: 'editNode',
      data: {
        nodeName: FIG0.NODE2_0,
        newNode: {
          ...topology.nodes.find(x => x.name === FIG0.NODE2_0),
          ant_azimuth: expect.any(Number),
        },
      },
    });
  });
});

function TestWrapper({networkContext, children}) {
  return (
    <TestApp>
      <NetworkContextWrapper contextValue={networkContext}>
        {children}
      </NetworkContextWrapper>
    </TestApp>
  );
}
