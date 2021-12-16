/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import MapLayers from '@fbcnms/tg-nms/app/views/map/mapLayers/MapLayers';
import MapLayersPanel from '@fbcnms/tg-nms/app/views/map/mappanels/MapLayersPanel';
import selectEvent from 'react-select-event';
import {DEFAULT_MAP_PROFILE} from '@fbcnms/tg-nms/app/constants/MapProfileConstants';
import {
  FIG0,
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  TestApp,
  mockFig0,
  mockIgnitionState,
  mockMapboxRef,
  mockNetworkConfig,
  mockOfflineWhitelist,
  mockTopologyConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {LinkOverlayColors} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import {
  MAPMODE,
  MapContextProvider,
} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {color} from 'd3-color';
import {
  getLayerById,
  getLineByLinkName,
  getPropValue,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {mockNetworkMapOptions} from '@fbcnms/tg-nms/app/tests/data/NmsOptionsContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {RenderResult} from '@testing-library/react';

const axiosGetMock = jest.spyOn(require('axios'), 'get');
axiosGetMock.mockResolvedValue(null);

const networkName = 'test';

describe('Default MapMode', () => {
  describe('Link Overlays', () => {
    test('Ignition Status', async () => {
      const topology = mockFig0();
      topology.__test.updateLink(FIG0.LINK1, {is_alive: false});
      topology.__test.updateLink(FIG0.LINK2, {is_alive: false});
      topology.__test.updateLink(FIG0.LINK3, {is_alive: false});
      const offline_whitelist = mockOfflineWhitelist(topology);
      offline_whitelist.links[FIG0.LINK3] = false;
      const {container} = await renderAsync(
        <MapTestWrapper
          networkCtx={{
            networkName,
            networkConfig: mockNetworkConfig({
              topology,
              offline_whitelist,
              ignition_state: mockIgnitionState({
                igCandidates: [
                  {
                    initiatorNodeName: '',
                    linkName: FIG0.LINK2,
                  },
                ],
              }),
            }),
            ...buildTopologyMaps(topology),
          }}>
          <MapTest />
        </MapTestWrapper>,
      );
      const layer = getLayerById(container, 'link-normal');
      const [seg1] = getLineByLinkName(layer, FIG0.LINK1);
      // not alive link previously ignited shows red
      expect(getPropValue(seg1, 'properties')).toMatchObject({
        linkColor: LinkOverlayColors.ignition_status.link_down.color,
      });
      // not alive link ignition candidate shows purple
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK2)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.ignition_status.igniting.color,
      });
      // not alive link ignition not in offline whitelist shows grey
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK3)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.ignition_status.planned.color,
      });
      // alive link shows green
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK4)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.ignition_status.link_up.color,
      });
    });

    test('Control Superframe', async () => {
      const topology = mockFig0();
      const link1 = topology.__test.getLink(FIG0.LINK1);
      const link2 = topology.__test.getLink(FIG0.LINK2);
      const link3 = topology.__test.getLink(FIG0.LINK3);
      if (!link1 || !link2 || !link3) {
        throw new Error('missing link');
      }
      const result = await renderAsync(
        <MapTestWrapper
          networkCtx={{
            networkName,
            networkConfig: mockNetworkConfig({
              topology,
              topologyConfig: mockTopologyConfig({
                controlSuperframe: {
                  [link1.a_node_name]: {
                    [link1.z_node_mac]: 0,
                  },
                  [link2.a_node_name]: {
                    [link2.z_node_mac]: 1,
                  },
                  [link3.a_node_name]: {
                    [link3.z_node_mac]: 255,
                  },
                },
              }),
            }),
            ...buildTopologyMaps(topology),
          }}>
          <MapTest />
        </MapTestWrapper>,
      );
      await selectLayerOverlay(result, 'Links Overlay', /control superframe/i);
      const layer = getLayerById(result.container, 'link-normal');
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK1)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.superframe[0].color,
        text: 0,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK2)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.superframe[1].color,
        text: 1,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK3)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.superframe[255].color,
        text: 255,
      });
    });

    test('MCS', async () => {
      const topology = mockFig0();
      axiosGetMock.mockResolvedValueOnce({
        data: {
          [FIG0.LINK1]: {
            A: {
              mcs: 12,
            },
            Z: {
              mcs: 12,
            },
          },
          [FIG0.LINK2]: {
            A: {
              mcs: 9,
            },
            Z: {
              mcs: 9,
            },
          },
          [FIG0.LINK3]: {
            A: {
              mcs: 7,
            },
            Z: {
              mcs: 0,
            },
          },
        },
      });
      const result = await renderAsync(
        <MapTestWrapper
          networkCtx={{
            networkName,
            networkConfig: mockNetworkConfig({
              topology,
            }),
            ...buildTopologyMaps(topology),
          }}>
          <MapTest />
        </MapTestWrapper>,
      );
      await selectLayerOverlay(result, 'Links Overlay', 'MCS');
      const layer = getLayerById(result.container, 'link-normal');

      /**
       * since MCS is a metric color, LinkOverlayColors hex is
       * converted to rgb and interpolated before rendering
       */
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK1)[0], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.excellent.color).formatRgb(),
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK1)[1], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.excellent.color).formatRgb(),
      });

      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK2)[0], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.good.color).formatRgb(),
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK2)[1], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.good.color).formatRgb(),
      });

      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK3)[0], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.marginal.color).formatRgb(),
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK3)[1], 'properties'),
      ).toMatchObject({
        linkColor: color(LinkOverlayColors.metric.poor.color).formatRgb(),
      });

      /**
       * missing metrics don't go through any interpolation so they don't
       * need to be compared as rgb
       */
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK4)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.metric.missing.color,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK4)[1], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.metric.missing.color,
      });
    });

    test('Channel', async () => {
      const topology = mockFig0();
      /**
       * mockFig0 by default creates all links with *_node_mac fields the same.
       * They only need to be unique for the overlay to work correctly.
       */
      topology.__test.updateLink(FIG0.LINK1, {a_node_mac: '11:11:11:11:11'});
      topology.__test.updateLink(FIG0.LINK2, {a_node_mac: '22:22:22:22:22'});
      topology.__test.updateLink(FIG0.LINK3, {a_node_mac: '33:33:33:33:33'});
      topology.__test.updateLink(FIG0.LINK4, {a_node_mac: '44:44:44:44:44'});

      const link1 = topology.__test.getLink(FIG0.LINK1);
      const link2 = topology.__test.getLink(FIG0.LINK2);
      const link3 = topology.__test.getLink(FIG0.LINK3);
      const link4 = topology.__test.getLink(FIG0.LINK4);
      if (!link1 || !link2 || !link3 || !link4) {
        throw new Error('missing link');
      }
      const result = await renderAsync(
        <MapTestWrapper
          networkCtx={{
            networkName,
            networkConfig: mockNetworkConfig({
              topology,
              topologyConfig: mockTopologyConfig({
                channel: {
                  [link1.a_node_mac]: 1,
                  [link2.a_node_mac]: 2,
                  [link3.a_node_mac]: 3,
                  [link4.a_node_mac]: 4,
                },
              }),
            }),
            ...buildTopologyMaps(topology),
          }}>
          <MapTest />
        </MapTestWrapper>,
      );

      await selectLayerOverlay(result, 'Links Overlay', /channel/i);
      const layer = getLayerById(result.container, 'link-normal');
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK1)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.channel[1].color,
        text: 1,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK2)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.channel[2].color,
        text: 2,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK3)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.channel[3].color,
        text: 3,
      });
      expect(
        getPropValue(getLineByLinkName(layer, FIG0.LINK4)[0], 'properties'),
      ).toMatchObject({
        linkColor: LinkOverlayColors.channel[4].color,
        text: 4,
      });
    });
  });
});

/**
 * Render the MapLayersPanel and the MapLayers using the real MapContextProvider
 * This tests map rendering as it relates to the map panels.
 */
function MapTest() {
  const networkCtx = useNetworkContext();
  return (
    <MapContextProvider
      defaultMapMode={MAPMODE.DEFAULT}
      mapProfiles={[DEFAULT_MAP_PROFILE]}
      mapboxRef={mockMapboxRef()}
      setIsSiteHidden={() => {}}>
      <MapLayers
        context={networkCtx}
        hiddenSites={new Set()}
        nearbyNodes={{}}
      />
      <MapLayersPanel
        expanded={true}
        mapStylesConfig={[]}
        onMapStyleSelectChange={jest.fn()}
        onPanelChange={jest.fn()}
        selectedMapStyle=""
      />
    </MapContextProvider>
  );
}

function MapTestWrapper({
  children,
  networkCtx,
}: {
  children: React.Node,
  networkCtx: $Shape<NetworkContextType>,
}) {
  return (
    <TestApp>
      <NmsOptionsContextWrapper
        contextValue={{networkMapOptions: mockNetworkMapOptions()}}>
        <NetworkContextWrapper contextValue={networkCtx}>
          {children}
        </NetworkContextWrapper>
      </NmsOptionsContextWrapper>
    </TestApp>
  );
}

async function selectLayerOverlay(
  {getByLabelText}: RenderResult<*>,
  layerName: string | RegExp,
  overlayName: string | RegExp,
) {
  await selectEvent.select(getByLabelText(layerName), overlayName, {
    container: document.body,
  });
}
