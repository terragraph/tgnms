/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import NetworkMap from '../NetworkMap';
import {Layer} from 'react-mapbox-gl';
import {
  NetworkContextWrapper,
  NmsOptionsContextWrapper,
  TestApp,
  clickPanel,
  getIsExpanded,
  initWindowConfig,
  mockNetworkConfig,
  mockSingleLink,
  renderWithRouter,
} from '../../../tests/testHelpers';
import {Router} from 'react-router-dom';
import {TopologyElementType} from '../../../constants/NetworkConstants';
import {act, fireEvent, render} from '@testing-library/react';
import {buildTopologyMaps} from '../../../helpers/TopologyHelpers';
import {createMemoryHistory} from 'history';
import {defaultNetworkMapOptions} from '../../../contexts/NmsOptionsContext';
import {mockNetworkMapOptions} from '../../../tests/data/NmsOptionsContext';

beforeEach(() => {
  initWindowConfig();
});

jest.mock('axios', () => {
  const ax = () => ({data: null});
  ax.get = ax;
  ax.post = ax;

  return ax;
});
jest.mock('mapbox-gl', () => ({
  Map: () => ({}),
}));

const commonProps = {
  /*
   * NetworkMap only uses bounds on the networkConfig passed as props.
   * All other uses of NetworkConfig consumed through context.
   */
  networkConfig: mockNetworkConfig(),
  networkName: 'test',
  siteToNodesMap: {},
  networkMapOptions: defaultNetworkMapOptions(),
  updateNetworkMapOptions: jest.fn(() => {}),
};

test('renders without crashing with minimal props ', () => {
  render(
    <MapWrapper>
      <NetworkMap {...commonProps} />
    </MapWrapper>,
  );
  // assert that layers were rendered
  expect(Layer).toHaveBeenCalled();
});

test('renders with some sites and links', () => {
  const topology = mockSingleLink();
  const topologyMaps = buildTopologyMaps(topology);

  renderWithRouter(
    <MapWrapper
      contextValue={{
        networkConfig: mockNetworkConfig({topology: topology}),
        ...topologyMaps,
      }}>
      <NetworkMap {...commonProps} />
    </MapWrapper>,
  );
});

describe('NetworkDrawer', () => {
  test('overview panel should be open by default', async () => {
    const {getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
    );
    const panel = getByTestId('overview-panel');
    expect(getIsExpanded(panel)).toBe(true);
  });
  test('overview panel should toggle', async () => {
    const {getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
    );
    const panel = getByTestId('overview-panel');
    expect(getIsExpanded(panel)).toBe(true);
    clickPanel(panel);
    expect(getIsExpanded(panel)).toBe(false);
    clickPanel(panel);
    expect(getIsExpanded(panel)).toBe(true);
  });
  test('map layers should toggle', async () => {
    const {getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
    );
    const panel = getByTestId('map-layers-panel');
    expect(getIsExpanded(panel)).toBe(false);
    clickPanel(panel);
    expect(getIsExpanded(panel)).toBe(true);
    clickPanel(panel);
    expect(getIsExpanded(panel)).toBe(false);
  });

  test('all panels close if an element is selected', async () => {
    const topology = mockSingleLink();
    const topologyMaps = buildTopologyMaps(topology);
    const selectedElement = {
      name: 'site1',
      type: TopologyElementType.SITE,
      expanded: true,
    };
    const {getByTestId, rerender} = render(
      <MapWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
        }}>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
    );
    // open both panels
    const ovPanel = getByTestId('overview-panel');
    const mapPanel = getByTestId('map-layers-panel');
    clickPanel(mapPanel);
    expect(getIsExpanded(ovPanel)).toBe(true);
    expect(getIsExpanded(mapPanel)).toBe(true);
    // render with selected topology element
    await rerender(
      <MapWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          selectedElement,
        }}>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
    );
    // both panels should be closed
    expect(getIsExpanded(ovPanel)).toBe(false);
    expect(getIsExpanded(mapPanel)).toBe(false);
  });
});

describe('TopologyBuilderMenu', () => {
  test('clicking Add Node opens the AddNodePanel', () => {
    const {getByText, getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />
      </MapWrapper>,
    );
    const fab = getByTestId('addTopologyIcon');
    act(() => {
      fireEvent.click(fab);
    });
    const btn = getByText(/add node/i);
    act(() => {
      fireEvent.click(btn);
    });
    const panel = getByTestId('add-node-panel');
    expect(getIsExpanded(panel)).toBe(true);
    // overview-panel should collapse automatically
    expect(getIsExpanded(getByTestId('overview-panel'))).toBe(false);
  });
  test('clicking Add Link opens the AddLinkPanel', () => {
    const {getByText, getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />
      </MapWrapper>,
    );
    const fab = getByTestId('addTopologyIcon');
    act(() => {
      fireEvent.click(fab);
    });
    const btn = getByText(/add link/i);
    act(() => {
      fireEvent.click(btn);
    });
    const panel = getByTestId('add-link-panel');
    expect(getIsExpanded(panel)).toBe(true);
    // overview-panel should collapse automatically
    expect(getIsExpanded(getByTestId('overview-panel'))).toBe(false);
  });
  test('clicking Add Site opens the AddSitePanel', () => {
    const {getByText, getByTestId} = render(
      <MapWrapper>
        <NetworkMap {...commonProps} />
      </MapWrapper>,
    );
    const fab = getByTestId('addTopologyIcon');
    act(() => {
      fireEvent.click(fab);
    });
    const btn = getByText(/add planned site/i);
    act(() => {
      fireEvent.click(btn);
    });
    const panel = getByTestId('add-site-panel');
    expect(getIsExpanded(panel)).toBe(true);
    // overview-panel should collapse automatically
    expect(getIsExpanded(getByTestId('overview-panel'))).toBe(false);
  });
  test('clicking edit node opens the panel', async () => {
    const topology = mockSingleLink();
    const topologyMaps = buildTopologyMaps(topology);
    const selectedElement = {
      name: 'node1',
      type: TopologyElementType.NODE,
      expanded: true,
    };
    const {getByText, getByTestId} = render(
      <MapWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          selectedElement,
        }}>
        <NetworkMap {...commonProps} />,
      </MapWrapper>,
      {baseElement: document.body ?? undefined},
    );

    await act(async () => {
      fireEvent.click(getByText(/view actions/i));
    });

    await act(async () => {
      fireEvent.click(getByText(/edit node/i));
    });

    expect(getByTestId('add-node-panel')).toBeInTheDocument();
  });
});

function MapWrapper({children, ...contextProps}: {children: React.Node}) {
  return (
    <TestApp>
      <Router history={createMemoryHistory()}>
        <NmsOptionsContextWrapper
          contextValue={{networkMapOptions: mockNetworkMapOptions()}}>
          <NetworkContextWrapper {...contextProps}>
            {children}
          </NetworkContextWrapper>
        </NmsOptionsContextWrapper>
      </Router>
    </TestApp>
  );
}
