/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import RemoteOverlayMetadataPanel from '../RemoteOverlayMetadataPanel';
import {MAPMODE} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockNetworkConfig,
  mockPanelControl,
  mockSingleLink,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {
  PANELS,
  PANEL_STATE,
} from '@fbcnms/tg-nms/app/features/map/usePanelControl';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {render} from '@testing-library/react';

import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const topology = mockSingleLink();
const mapCtx: $Shape<MapContext> = {
  mapMode: MAPMODE.CUSTOM_OVERLAYS,
  overlayMetadata: {
    site_icons: {
      site1: {
        '<testkey>': 'test value',
        '<testkey2>': 123,
        'object value': {
          health: 1,
        },
      },
    },
    link_lines: {
      'link-node1-node2': {
        A: {
          'test key A': '123',
        },
        Z: {
          kitten: '123',
        },
      },
    },
  },
};
test(
  'panel opens when an element with metadata is ' +
    'selected and closes when deselected',
  async () => {
    const mockPanel = mockPanelControl();
    const {rerender} = await render(
      <Wrapper
        mapCtx={mapCtx}
        networkCtx={{
          selectedElement: {
            name: 'site1',
            type: TOPOLOGY_ELEMENT.SITE,
            expanded: true,
          },
          networkConfig: mockNetworkConfig({topology}),
          ...buildTopologyMaps(topology),
        }}>
        <RemoteOverlayMetadataPanel panelControl={mockPanel} />
      </Wrapper>,
    );
    expect(mockPanel.getIsOpen).toHaveBeenCalled();
    expect(mockPanel.setPanelState).toHaveBeenCalledWith(
      PANELS.CUSTOM_OVERLAY_METADATA,
      PANEL_STATE.OPEN,
    );

    //rerender with nothing selected, panel should hide
    await rerender(
      <Wrapper
        mapCtx={{
          mapMode: MAPMODE.CUSTOM_OVERLAYS,
          overlayMetadata: {
            site_icons: {
              test: {
                value: '1',
                metadata: {
                  kitten: '123',
                },
              },
            },
          },
        }}
        networkCtx={{
          selectedElement: null,
          networkConfig: mockNetworkConfig({topology}),
          ...buildTopologyMaps(topology),
        }}>
        <RemoteOverlayMetadataPanel panelControl={mockPanel} />
      </Wrapper>,
    );
    expect(mockPanel.setPanelState).toHaveBeenCalledWith(
      PANELS.CUSTOM_OVERLAY_METADATA,
      PANEL_STATE.HIDDEN,
    );
  },
);
test('renders metadata keys and primitive values', async () => {
  const mockPanel = mockPanelControl({
    getIsHidden: jest.fn().mockReturnValue(false),
  });
  // site selected
  const {getByText, rerender} = await render(
    <Wrapper
      mapCtx={mapCtx}
      networkCtx={{
        selectedElement: {
          name: 'site1',
          type: TOPOLOGY_ELEMENT.SITE,
          expanded: true,
        },
        networkConfig: mockNetworkConfig({topology}),
        ...buildTopologyMaps(topology),
      }}>
      <RemoteOverlayMetadataPanel panelControl={mockPanel} />
    </Wrapper>,
  );
  expect(getByText('<testkey>')).toBeInTheDocument();
  expect(getByText('<testkey2>')).toBeInTheDocument();
  expect(getByText('test value')).toBeInTheDocument();

  // link selected
  await rerender(
    <Wrapper
      mapCtx={mapCtx}
      networkCtx={{
        selectedElement: {
          name: 'link-node1-node2',
          type: TOPOLOGY_ELEMENT.LINK,
          expanded: true,
        },
        networkConfig: mockNetworkConfig({topology}),
        ...buildTopologyMaps(topology),
      }}>
      <RemoteOverlayMetadataPanel panelControl={mockPanel} />
    </Wrapper>,
  );

  expect(getByText('test key A')).toBeInTheDocument();
});
test('renders metadata with object values as json', async () => {
  const mockPanel = mockPanelControl({
    getIsHidden: jest.fn().mockReturnValue(false),
  });
  const {getByTestId} = await render(
    <Wrapper
      mapCtx={mapCtx}
      networkCtx={{
        selectedElement: {
          name: 'site1',
          type: TOPOLOGY_ELEMENT.SITE,
          expanded: true,
        },
        networkConfig: mockNetworkConfig({topology}),
        ...buildTopologyMaps(topology),
      }}>
      <RemoteOverlayMetadataPanel panelControl={mockPanel} />
    </Wrapper>,
  );

  const metadataJson = getByTestId('metadata-json').textContent;
  expect(JSON.parse(metadataJson)).toMatchObject({
    health: 1,
  });
});

test('renders metadata for singlesided link metrics', async () => {
  const mockPanel = mockPanelControl({
    getIsHidden: jest.fn().mockReturnValue(false),
  });
  const {getByText} = await render(
    <Wrapper
      mapCtx={{
        ...mapCtx,
        overlayMetadata: {
          link_lines: {
            'link-node1-node2': {
              'test key A': '123',
            },
          },
        },
      }}
      networkCtx={{
        selectedElement: {
          name: 'link-node1-node2',
          type: TOPOLOGY_ELEMENT.LINK,
          expanded: true,
        },
        networkConfig: mockNetworkConfig({topology}),
        ...buildTopologyMaps(topology),
      }}>
      <RemoteOverlayMetadataPanel panelControl={mockPanel} />
    </Wrapper>,
  );

  expect(getByText('test key A')).toBeInTheDocument();
});

function Wrapper({
  children,
  networkCtx,
  mapCtx,
}: {
  children: React.Node,
  networkCtx: $Shape<NetworkContextType>,
  mapCtx: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <NetworkContextWrapper contextValue={networkCtx}>
        <MapContextWrapper contextValue={mapCtx}>{children}</MapContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
