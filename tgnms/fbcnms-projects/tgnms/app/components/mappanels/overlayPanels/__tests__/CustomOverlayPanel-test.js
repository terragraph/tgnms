/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import MapLayers from '@fbcnms/tg-nms/app/views/map/mapLayers/MapLayers';
import MapLayersPanel from '@fbcnms/tg-nms/app/components/mappanels/MapLayersPanel';
import axiosMock from 'axios';
import {
  MAPMODE,
  MapContextProvider,
} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  TestApp,
  mockFig0,
  mockMapboxRef,
  mockNetworkConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {RESPONSE_TYPE} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import {act, cleanup, fireEvent} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  getFeatureBySiteName,
  getLayerById,
  getLineByLinkName,
  getPropValue,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import {mockNetworkMapOptions} from '@fbcnms/tg-nms/app/tests/data/NmsOptionsContext';
import {useNetworkContext} from '../../../../contexts/NetworkContext';
import type {
  LegendDef,
  OverlayResponse,
} from '@fbcnms/tg-nms/shared/dto/RemoteOverlay';
import type {MapProfile} from '@fbcnms/tg-nms/shared/dto/MapProfile';

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
  jest.clearAllMocks();
  queryRemoteOverlayMock.mockReset();
  cleanup();
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
const topology = mockFig0();
// node names are generated by mockFig0
const node1_0 = 'site1-0';
const node1_1 = 'site1-1';
const node2_0 = 'site2-0';
const node2_1 = 'site2-1';
const node3_0 = 'site3-0';
const node3_1 = 'site3-1';
const node4_0 = 'site4-0';
const node4_1 = 'site4-1';
const mkLink = (...nodes: [string, string]) => `link-${nodes[0]}-${nodes[1]}`;

const link1 = mkLink(node1_1, node2_0);
const link2 = mkLink(node2_1, node3_0);
const link3 = mkLink(node3_1, node4_0);
const link4 = mkLink(node4_1, node1_0);
const topologyResponse: OverlayResponse = {
  type: RESPONSE_TYPE.topology,
  data: {
    links: {
      [link1]: {
        A: {value: 0, text: 'Link 1 A Text'},
        Z: {
          value: 1,
          text: 'Link 1 Z Text',
        },
      },
      [link2]: {
        A: {value: 5, text: 'Link 2 A Text'},
        Z: {
          value: 6,
          text: 'Link 2 Z Text',
        },
      },
      [link3]: {
        A: {value: 8, text: 'Link 3 A Text'},
        Z: {
          value: 10,
          text: 'Link 3 Z Text',
        },
      },
      [link4]: {
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
    nodes: {},
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
      networkName,
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
            [link1]: {
              A: {value: '10'},
              Z: {
                value: '15',
              },
            },
            [link2]: {
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
            [link1]: null,
            [link2]: {
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
            [link1]: {
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
    const [seg1, seg2] = getLineByLinkName(layer, link1);
    expect(getPropValue(seg1, 'properties')).toMatchObject({text: '10'});
    expect(getPropValue(seg2, 'properties')).toMatchObject({text: '15'});
  });

  test(
    'colors link segments based on legend and' + ' LERPs between color stops',
    async () => {
      queryRemoteOverlayMock.mockResolvedValueOnce(topologyResponse);
      const {container} = await renderAsync(<FigureZeroMapTest />);
      const layer = getLayerById(container, 'link-normal');
      const [link1Seg1, link1Seg2] = getLineByLinkName(layer, link1);
      const [link2Seg1, link2Seg2] = getLineByLinkName(layer, link2);
      const [link3Seg1, link3Seg2] = getLineByLinkName(layer, link3);
      const [link4Seg1, link4Seg2] = getLineByLinkName(layer, link4);
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
    const [link1Seg1, link1Seg2] = getLineByLinkName(layer, link1);
    const [link2Seg1, link2Seg2] = getLineByLinkName(layer, link2);
    const [link3Seg1, link3Seg2] = getLineByLinkName(layer, link3);
    const [link4Seg1, link4Seg2] = getLineByLinkName(layer, link4);

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

describe('CustomOverlayPanel', () => {
  function OverlayPanelTest({mapProfiles}: {mapProfiles: Array<MapProfile>}) {
    const networkCtx = useNetworkContext();
    return (
      <MapContextProvider mapProfiles={mapProfiles} mapboxRef={mockMapboxRef()}>
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
      mapboxRef={mockMapboxRef()}>
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
