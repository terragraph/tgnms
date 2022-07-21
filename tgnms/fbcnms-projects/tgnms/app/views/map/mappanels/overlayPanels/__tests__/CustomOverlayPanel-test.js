/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import MapLayers from '@fbcnms/tg-nms/app/views/map/mapLayers/MapLayers';
import MapLayersPanel from '@fbcnms/tg-nms/app/views/map/mappanels/MapLayersPanel';
import axiosMock from 'axios';
import {
  FIG0,
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  TestApp,
  mockFig0,
  mockMapboxRef,
  mockNetworkConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  MAPMODE,
  MapContextProvider,
} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {RESPONSE_TYPE} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import {act, fireEvent} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  getFeatureBySiteName,
  getLayerById,
  getLineByLinkName,
  getPropValue,
  getSourceFeatureCollection,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {mockNetworkMapOptions} from '@fbcnms/tg-nms/app/tests/data/NmsOptionsContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {GeoFeature, GeoFeatureCollection} from '@turf/turf';
import type {
  LegendDef,
  OverlayResponse,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';
import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

jest.mock('axios');
jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

jest.useFakeTimers();
let queryRemoteOverlayMock;
beforeEach(() => {
  queryRemoteOverlayMock = jest.spyOn(
    require('@fbcnms/tg-nms/app/apiutils/MapAPIUtil'),
    'queryRemoteOverlay',
  );
});
afterEach(() => {
  queryRemoteOverlayMock.mockReset();
});

const RGB_BLACK = 'rgb(0, 0, 0)';
const RGB_GREY = 'rgb(128, 128, 128)';
const RGB_WHITE = 'rgb(255, 255, 255)';
// colors always get converted to rgb so just start off as rgb
const COLOR_SCALE: Array<LegendDef> = [
  {color: RGB_WHITE, label: 'HEALTHY', value: 10},
  {color: RGB_GREY, label: 'DEGRADED', value: 5},
  {color: RGB_BLACK, label: 'ERROR', value: 0},
];

const defaultLegend = {
  links: {items: COLOR_SCALE},
  sites: {items: COLOR_SCALE},
  nodes: {items: COLOR_SCALE},
};

const {LINK1, LINK2, LINK3, LINK4} = FIG0;
const topology = mockFig0();

const topologyResponse: OverlayResponse = {
  type: RESPONSE_TYPE.topology,
  data: {
    links: {
      [LINK1]: {
        A: {value: 0, text: 'Link 1 A Text'},
        Z: {
          value: 1,
          text: 'Link 1 Z Text',
        },
      },
      [LINK2]: {
        A: {value: 5, text: 'Link 2 A Text'},
        Z: {
          value: 6,
          text: 'Link 2 Z Text',
        },
      },
      [LINK3]: {
        A: {value: 8, text: 'Link 3 A Text'},
        Z: {
          value: 10,
          text: 'Link 3 Z Text',
        },
      },
      [LINK4]: {
        value: 10,
        text: 'Link 4 Text',
        metadata: {
          testKey: 'test',
        },
      },
    },
    sites: {
      site1: {
        value: 0,
      },
      site2: {
        value: 5,
      },
      site3: {
        value: 8,
      },
      site4: {
        value: 10,
      },
    },
    nodes: {
      [FIG0.NODE1_0]: {
        value: 0,
      },
      [FIG0.NODE1_1]: {
        value: 5,
      },
      [FIG0.NODE2_0]: {
        value: 10,
      },
      [FIG0.NODE2_1]: {
        value: 8,
      },
    },
  },
  legend: defaultLegend,
};

const networkName = 'test';
const mapProfile: MapProfile = {
  id: 0,
  name: 'test_profile',
  data: {
    mcsTable: [],
    remoteOverlays: [
      {
        id: 'test',
        name: 'test',
        url: 'http://test.com',
        enabled: true,
        httpMethod: 'POST',
        useProxy: false,
      },
    ],
  },
  networks: [networkName],
};

const defaultMapLayersProps = {
  hiddenSites: new Set(),
  nearbyNodes: {},
};
const defaultMapLayersPanelProps = {
  expanded: true,
  mapStylesConfig: [],
  onMapStyleSelectChange: jest.fn(),
  onPanelChange: jest.fn(),
  selectedMapStyle: '',
};

describe('Data fetching', () => {
  test('requests the currently selected overlay on first render', async () => {
    queryRemoteOverlayMock.mockResolvedValueOnce(
      ({
        type: RESPONSE_TYPE.topology,
        data: {
          links: {
            'link-site2-1-site3-0': {
              A: {value: '10', text: ''},
              Z: {
                value: '15',
                text: '',
              },
            },
          },
          sites: {},
          nodes: {},
        },
        legend: defaultLegend,
      }: OverlayResponse),
    );
    const topologyMaps = buildTopologyMaps(topology);
    await renderAsync(
      <MapWrapper
        contextValue={{
          networkName,
          networkConfig: mockNetworkConfig({
            topology: topology,
          }),
          ...topologyMaps,
        }}>
        <MapTest />
      </MapWrapper>,
    );
    expect(queryRemoteOverlayMock).toHaveBeenCalledWith({
      network_name: networkName,
      overlay: {
        id: 'test',
        name: 'test',
        url: 'http://test.com',
        enabled: true,
        httpMethod: 'POST',
        useProxy: false,
      },
    });
  });

  describe('remote api errors', () => {
    beforeEach(() => {
      queryRemoteOverlayMock.mockReset();
    });
    test('remote overlay api can return http error without crashing UI', async () => {
      queryRemoteOverlayMock.mockRestore();
      const mockPost = axiosMock.post.mockRejectedValueOnce(
        new Error('AXIOS ERROR TEST'),
      );
      // removes the mock from queryRemoteOverlay to directly test axios errors
      await renderAsync(<FigureZeroMapTest />);

      expect(mockPost).toHaveBeenCalled();
    });

    test('remote overlay api can return bad data without crashing the UI', async () => {
      queryRemoteOverlayMock.mockResolvedValueOnce({
        type: RESPONSE_TYPE.topology,
        //BAD DATA
        data: {
          links: {
            [LINK1]: {
              A: {value: '10'},
              Z: {
                value: '15',
              },
            },
            [LINK2]: {
              A: null,
              Z: {
                random: '15',
              },
            },
          },
        },
      });
      queryRemoteOverlayMock.mockResolvedValueOnce({
        type: RESPONSE_TYPE.topology,
        //BAD DATA
        data: {
          links: {
            [LINK1]: null,
            [LINK2]: {
              A: null,
              Z: {
                random: '15',
              },
            },
          },
        },
        legend: {},
      });
      queryRemoteOverlayMock.mockResolvedValueOnce({
        type: RESPONSE_TYPE.topology,
        data: null,
        legend: {
          links: null,
        },
      });
      expect(queryRemoteOverlayMock).toHaveBeenCalledTimes(0);
      const {rerender} = await renderAsync(<FigureZeroMapTest />);
      expect(queryRemoteOverlayMock).toHaveBeenCalledTimes(1);
      // latest data is fetched on a time interval
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      await rerender(<FigureZeroMapTest />);
      expect(queryRemoteOverlayMock).toHaveBeenCalledTimes(2);
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      await rerender(<FigureZeroMapTest />);
      expect(queryRemoteOverlayMock).toHaveBeenCalledTimes(3);
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      await rerender(<FigureZeroMapTest />);
      expect(queryRemoteOverlayMock).toHaveBeenCalledTimes(4);
    });

    test('error message shows when api returns an error', async () => {
      queryRemoteOverlayMock.mockRejectedValueOnce(new Error(''));
      // removes the mock from queryRemoteOverlay to directly test axios errors
      const {getByTestId} = await renderAsync(<FigureZeroMapTest />);
      expect(getByTestId('overlay-error')).toBeInTheDocument();
    });
  });
});

describe('LinksLayer', () => {
  test('renders value as text', async () => {
    queryRemoteOverlayMock.mockResolvedValueOnce(
      ({
        type: RESPONSE_TYPE.topology,
        data: {
          links: {
            [LINK1]: {
              A: {value: '10'},
              Z: {
                value: '15',
              },
            },
          },
          sites: {},
          nodes: {},
        },
        legend: defaultLegend,
      }: OverlayResponse),
    );
    const {container} = await renderAsync(<FigureZeroMapTest />);
    const layer = getLayerById(container, 'link-normal');
    const [seg1, seg2] = getLineByLinkName(layer, LINK1);
    expect(getPropValue(seg1, 'properties')).toMatchObject({text: '10'});
    expect(getPropValue(seg2, 'properties')).toMatchObject({text: '15'});
  });

  test(
    'colors link segments based on legend and' + ' LERPs between color stops',
    async () => {
      queryRemoteOverlayMock.mockResolvedValueOnce(topologyResponse);
      const {container} = await renderAsync(<FigureZeroMapTest />);
      const layer = getLayerById(container, 'link-normal');
      const [link1Seg1, link1Seg2] = getLineByLinkName(layer, LINK1);
      const [link2Seg1, link2Seg2] = getLineByLinkName(layer, LINK2);
      const [link3Seg1, link3Seg2] = getLineByLinkName(layer, LINK3);
      const [link4Seg1, link4Seg2] = getLineByLinkName(layer, LINK4);
      expect(getPropValue(link1Seg1, 'properties')).toMatchObject({
        linkColor: RGB_BLACK,
      });
      expect(getPropValue(link1Seg2, 'properties')).toMatchObject({
        linkColor: 'rgb(29, 29, 29)',
      });
      expect(getPropValue(link2Seg1, 'properties')).toMatchObject({
        linkColor: RGB_GREY,
      });
      expect(getPropValue(link2Seg2, 'properties')).toMatchObject({
        linkColor: 'rgb(152, 152, 152)',
      });
      expect(getPropValue(link3Seg1, 'properties')).toMatchObject({
        linkColor: 'rgb(202, 202, 202)',
      });
      expect(getPropValue(link3Seg2, 'properties')).toMatchObject({
        linkColor: RGB_WHITE,
      });
      // link 4 metric is sideless
      expect(getPropValue(link4Seg1, 'properties')).toMatchObject({
        linkColor: RGB_WHITE,
      });
      expect(getPropValue(link4Seg2, 'properties')).toMatchObject({
        linkColor: RGB_WHITE,
      });
    },
  );

  test('renders the "text" property of metrics', async () => {
    queryRemoteOverlayMock.mockResolvedValueOnce(topologyResponse);
    const {container} = await renderAsync(<FigureZeroMapTest />);
    const layer = getLayerById(container, 'link-normal');
    const [link1Seg1, link1Seg2] = getLineByLinkName(layer, LINK1);
    const [link2Seg1, link2Seg2] = getLineByLinkName(layer, LINK2);
    const [link3Seg1, link3Seg2] = getLineByLinkName(layer, LINK3);
    const [link4Seg1, link4Seg2] = getLineByLinkName(layer, LINK4);

    expect(getPropValue(link1Seg1, 'properties')).toMatchObject({
      text: 'Link 1 A Text',
    });
    expect(getPropValue(link1Seg2, 'properties')).toMatchObject({
      text: 'Link 1 Z Text',
    });
    expect(getPropValue(link2Seg1, 'properties')).toMatchObject({
      text: 'Link 2 A Text',
    });
    expect(getPropValue(link2Seg2, 'properties')).toMatchObject({
      text: 'Link 2 Z Text',
    });
    expect(getPropValue(link3Seg1, 'properties')).toMatchObject({
      text: 'Link 3 A Text',
    });
    expect(getPropValue(link3Seg2, 'properties')).toMatchObject({
      text: 'Link 3 Z Text',
    });
    // link 4 metric is sideless
    expect(getPropValue(link4Seg1, 'properties')).toMatchObject({
      text: 'Link 4 Text',
    });
    expect(getPropValue(link4Seg2, 'properties')).toMatchObject({
      text: 'Link 4 Text',
    });
  });

  test(
    'renders with topology as default ' + 'remote overlay response type',
    async () => {
      expect(topologyResponse.type).toBe('topology');
      // remove the type from the response, ensure layer still renders
      const {type: _, ...response} = topologyResponse;
      // $FlowIgnore purposely breaking flow
      expect(response.type).toBe(undefined);
      queryRemoteOverlayMock.mockResolvedValueOnce(response);
      const {container} = await renderAsync(<FigureZeroMapTest />);
      const layer = getLayerById(container, 'link-normal');
      const [link1Seg1] = getLineByLinkName(layer, FIG0.LINK1);
      expect(getPropValue(link1Seg1, 'properties')).toMatchObject({
        text: 'Link 1 A Text',
        linkColor: RGB_BLACK,
      });
    },
  );
});

describe('SitesLayer', () => {
  test(
    'colors sites based on legend and' + ' LERPs between color stops',
    async () => {
      queryRemoteOverlayMock.mockResolvedValueOnce(topologyResponse);
      const {container} = await renderAsync(<FigureZeroMapTest />);
      const layer = getLayerById(container, 'site-layer');
      const site1 = getFeatureBySiteName(layer, 'site1');
      const site2 = getFeatureBySiteName(layer, 'site2');
      const site3 = getFeatureBySiteName(layer, 'site3');
      const site4 = getFeatureBySiteName(layer, 'site4');
      expect(getPropValue(site1, 'properties')).toMatchObject({
        siteColor: RGB_BLACK,
      });
      expect(getPropValue(site2, 'properties')).toMatchObject({
        siteColor: RGB_GREY,
      });
      expect(getPropValue(site3, 'properties')).toMatchObject({
        siteColor: `rgb(202, 202, 202)`,
      });
      expect(getPropValue(site4, 'properties')).toMatchObject({
        siteColor: RGB_WHITE,
      });
    },
  );
});

describe('NodesLayer', () => {
  test(
    'colors nodes based on legend and' + ' LERPs between color stops',
    async () => {
      queryRemoteOverlayMock.mockResolvedValueOnce(topologyResponse);
      const {container} = await renderAsync(<FigureZeroMapTest />);
      const geojson = getSourceFeatureCollection(container, 'nodes');
      const {node: node1} = getNodeFromFeatureCollection(geojson, FIG0.NODE1_0);
      const {node: node2} = getNodeFromFeatureCollection(geojson, FIG0.NODE1_1);
      const {node: node3} = getNodeFromFeatureCollection(geojson, FIG0.NODE2_0);
      const {node: node4} = getNodeFromFeatureCollection(geojson, FIG0.NODE2_1);
      expect(node1?.color).toBe(RGB_BLACK);
      expect(node2?.color).toBe(RGB_GREY);
      expect(node3?.color).toBe(RGB_WHITE);
      expect(node4?.color).toBe('rgb(202, 202, 202)');
    },
  );
});

function getNodeFromFeatureCollection(
  fc: GeoFeatureCollection,
  nodeName: string,
): {
  //TODO create NodeProperties shape or something
  node?: $Shape<NodeType & {bearing: number, color: number}>,
  feature?: GeoFeature,
} {
  for (const f of fc.features) {
    const nodeProps = (f.properties: $Shape<
      NodeType & {bearing: number, color: number},
    >);
    if (nodeProps.name === nodeName) {
      return {node: nodeProps, feature: f};
    }
  }
  return {};
}

describe('CustomOverlayPanel', () => {
  function OverlayPanelTest({mapProfiles}: {mapProfiles: Array<MapProfile>}) {
    const networkCtx = useNetworkContext();
    return (
      <MapContextProvider
        mapProfiles={mapProfiles}
        mapboxRef={mockMapboxRef()}
        setIsSiteHidden={() => {}}>
        <MapLayers context={networkCtx} {...defaultMapLayersProps} />
        <MapLayersPanel {...defaultMapLayersPanelProps} />
      </MapContextProvider>
    );
  }
  test('Does not show custom panel if network profile has no custom overlays', async () => {
    const {queryByText, getByText, rerender} = await renderAsync(
      <MapWrapper
        contextValue={{
          networkName: '<no profile network>',
          networkConfig: mockNetworkConfig({
            topology: topology,
          }),
          ...buildTopologyMaps(topology),
        }}>
        <OverlayPanelTest mapProfiles={[mapProfile]} />
      </MapWrapper>,
    );
    expect(queryByText('Custom')).not.toBeInTheDocument();
    // switch to a network that does have custom overlays, tab should show
    await rerender(
      <MapWrapper
        contextValue={{
          networkName,
          networkConfig: mockNetworkConfig({
            topology: topology,
          }),
          ...buildTopologyMaps(topology),
        }}>
        <OverlayPanelTest mapProfiles={[mapProfile]} />
      </MapWrapper>,
    );
    const customTab = getByText('Custom');
    await act(async () => {
      fireEvent.click(customTab);
    });
  });

  test(
    'If user switches to a network that does not have custom overlays,' +
      ' mapmode should be changed from custom to default',
    async () => {
      const {
        getByTestId,
        getByText,
        queryByTestId,
        queryByText,
        rerender,
      } = await renderAsync(
        <MapWrapper
          contextValue={{
            networkName,
            networkConfig: mockNetworkConfig({
              topology: topology,
            }),
            ...buildTopologyMaps(topology),
          }}>
          <OverlayPanelTest mapProfiles={[mapProfile]} />
        </MapWrapper>,
      );
      expect(queryByText('Custom')).toBeInTheDocument();
      const customTab = getByText('Custom');
      await act(async () => {
        fireEvent.click(customTab);
      });
      expect(getByTestId('custom-overlay-panel')).toBeInTheDocument();

      /**
       * switch to a network that does not have custom overlays, user should be
       * switched off of custom map mode
       */
      await rerender(
        <MapWrapper
          contextValue={{
            networkName: '<no profile network>',
            networkConfig: mockNetworkConfig({
              topology: topology,
            }),
            ...buildTopologyMaps(topology),
          }}>
          <OverlayPanelTest mapProfiles={[mapProfile]} />
        </MapWrapper>,
      );
      expect(queryByTestId('custom-overlay-panel')).not.toBeInTheDocument();
    },
  );
});

/**
 * Render MapTest with the default figure0 topology
 */
function FigureZeroMapTest() {
  return (
    <MapWrapper
      contextValue={{
        networkName,
        networkConfig: mockNetworkConfig({
          topology: topology,
        }),
        ...buildTopologyMaps(topology),
      }}>
      <MapTest />
    </MapWrapper>
  );
}

/**
 * Render the MapLayersPanel and the MapLayers using the real MapContextProvider
 * This tests map rendering as it relates to the map panels.
 */
function MapTest() {
  const networkCtx = useNetworkContext();
  return (
    <MapContextProvider
      defaultMapMode={MAPMODE.CUSTOM_OVERLAYS}
      mapProfiles={[mapProfile]}
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

/**
 * Some generic contexts
 */
function MapWrapper({children, ...contextProps}: {children: React.Node}) {
  return (
    <TestApp>
      <NmsOptionsContextWrapper
        contextValue={{networkMapOptions: mockNetworkMapOptions()}}>
        <NetworkContextWrapper {...contextProps}>
          {children}
        </NetworkContextWrapper>
      </NmsOptionsContextWrapper>
    </TestApp>
  );
}
