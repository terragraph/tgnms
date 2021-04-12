/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import NodesLayer, {
  BEARING_PROP,
  LAYER_ID,
  NODE_IMAGE_ID,
  NODE_IMAGE_PATH,
  SOURCE_ID,
} from '../NodeOverlay';
import {Layer as LayerMock} from 'react-mapbox-gl';
import {
  MapContextWrapper,
  NetworkContextWrapper,
  TestApp,
  mockFig0,
  mockMapboxRef,
  mockNetworkConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act} from '@testing-library/react';
import {buildTopologyMaps} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  getLayerById,
  getPropValue,
  getSourceFeatureCollection,
} from '@fbcnms/tg-nms/app/tests/mapHelpers';

import type {NetworkContextType} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

jest
  .spyOn(
    require('@fbcnms/tg-nms/app/helpers/NetworkHelpers'),
    'mapboxShouldAcceptClick',
  )
  .mockReturnValue(true);
let mapboxMock = mockMapboxRef();
beforeEach(() => {
  mapboxMock = mockMapboxRef();
});

test('does not load sector icon image twice', async () => {
  const {rerender} = await renderAsync(
    <Wrapper>
      <NodesLayer />
    </Wrapper>,
  );
  expect(mapboxMock?.loadImage).toHaveBeenCalledWith(
    NODE_IMAGE_PATH,
    expect.any(Function),
  );
  expect(mapboxMock?.addImage).toHaveBeenCalled();
  // break reference equality but keep mocks the same to keep state
  mapboxMock = {...mapboxMock};
  await act(async () => {
    await rerender(
      <Wrapper>
        <NodesLayer />
      </Wrapper>,
    );
  });
  expect(mapboxMock?.loadImage).toHaveBeenCalledTimes(1);
  expect(mapboxMock?.addImage).toHaveBeenCalledTimes(1);
  expect(mapboxMock?.hasImage).toHaveBeenCalledTimes(2);
});
test('all geojson features have bearing property', async () => {
  const {container} = await renderAsync(
    <Wrapper>
      <NodesLayer />
    </Wrapper>,
  );
  const data = getSourceFeatureCollection(container, SOURCE_ID);
  // the mockFig0 provided in Wrapper has 8 nodes
  expect(data.features.length).toBe(8);
  for (const nodeFeature of data.features) {
    expect(nodeFeature.properties.bearing).toBeDefined();
  }
});
test('mapbox icon-rotate layout property matches bearing property', async () => {
  const {container} = await renderAsync(
    <Wrapper>
      <NodesLayer />
    </Wrapper>,
  );
  const data = getSourceFeatureCollection(container, SOURCE_ID);
  const layer = getLayerById(container, LAYER_ID);
  if (!layer) {
    throw new Error('layer not found');
  }
  const layerLayout = getPropValue(layer, 'layout');
  if (!layerLayout) {
    throw new Error('layer layout not found');
  }
  const [_, bearingProp] = layerLayout['icon-rotate'];
  expect(layerLayout['icon-rotate']).toEqual(['get', BEARING_PROP]);
  for (const feature of data.features) {
    expect(feature.properties[bearingProp]).toBeDefined();
  }
});
test('mapbox icon-image property matches the image passed to addImage', async () => {
  const {container} = await renderAsync(
    <Wrapper>
      <NodesLayer />
    </Wrapper>,
  );
  const imagePath = mapboxMock?.addImage.mock.calls[0][0];
  expect(imagePath).toBe(NODE_IMAGE_ID);
  const layer = getLayerById(container, LAYER_ID);
  if (!layer) {
    throw new Error('layer not found');
  }
  const layerLayout = getPropValue(layer, 'layout');
  if (!layerLayout) {
    throw new Error('layer layout not found');
  }
  expect(layerLayout['icon-image']).toBe(imagePath);
});
test('clicking a node selects it', async () => {
  const mockSetSelected = jest.fn();
  await renderAsync(
    <Wrapper networkVals={{setSelected: mockSetSelected}}>
      <NodesLayer />
    </Wrapper>,
  );
  const lastProps = LayerMock.mock.calls.slice(-1)[0][0];
  const onClickCallback = lastProps.onClick;
  onClickCallback({
    features: [
      {
        source: SOURCE_ID,
        properties: {
          name: 'test',
        },
      },
    ],
  });
  // clicking a node should select it in the network context
  expect(mockSetSelected).toHaveBeenCalledWith('node', 'test');

  // invoke the clickhandler in a few different ways for test coverage
  expect(onClickCallback({})).not.toBeDefined();
  expect(onClickCallback({features: []})).not.toBeDefined();
  expect(onClickCallback({features: [{source: SOURCE_ID}]})).not.toBeDefined();
});

function Wrapper({
  children,
  networkVals,
}: {
  children: React.Node,
  networkVals?: $Shape<NetworkContextType>,
}) {
  const topology = mockFig0();
  const topologyMaps = buildTopologyMaps(topology);
  return (
    <TestApp>
      <NetworkContextWrapper
        contextValue={{
          networkConfig: mockNetworkConfig({topology: topology}),
          ...topologyMaps,
          ...(networkVals || {}: $Shape<NetworkContextType>),
        }}>
        {/* $FlowIgnore It's a mock */}
        <MapContextWrapper contextValue={{mapboxRef: mapboxMock}}>
          {children}
        </MapContextWrapper>
      </NetworkContextWrapper>
    </TestApp>
  );
}
