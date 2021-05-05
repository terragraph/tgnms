/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import TopologyBuilderLayer from '../TopologyBuilderLayer';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {TopologyBuilderContextProvider} from '@fbcnms/tg-nms/app/views/map/mappanels/topologyCreationPanels/TopologyBuilderContext';
import {act, fireEvent, render} from '@testing-library/react';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

jest.mock('@fbcnms/tg-nms/app/apiutils/MapAPIUtil');
jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

describe('TopologyBuilderLayer', () => {
  test('Renders button into mapboxControl', async () => {
    mockMapboxTopologyBuilder();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <TopologyBuilderLayer />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-topology-toggle-container')).toBeInTheDocument();
    expect(getByTestId('tg-topology-toggle')).toBeInTheDocument();
  });

  test('clicking topology toggle adds/removes the button', async () => {
    mockMapboxTopologyBuilder();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <TopologyBuilderLayer />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-topology-toggle-container')).toBeInTheDocument();
    const toggle = getByTestId('tg-topology-toggle');
    expect(toggle).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(toggle);
    });
  });

  test('adds control', async () => {
    mockMapboxTopologyBuilder();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <TopologyBuilderLayer />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalled();
    expect(getByTestId('tg-topology-toggle-container')).toBeInTheDocument();
  });

  test('toggles the builder control when mapbox dispatches tg.builder.toggle event', async () => {
    mockMapboxTopologyBuilder();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId, queryByTitle, getByTitle} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <TopologyBuilderLayer />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(getByTestId('tg-topology-toggle'));
    });
    expect(getByTitle('Add node')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByTestId('tg-topology-toggle'));
    });
    expect(queryByTitle('Add node')).not.toBeInTheDocument();
  });
});

function Wrapper({
  children,
  mapValue,
}: {
  children: React.Node,
  mapValue?: $Shape<MapContext>,
}) {
  return (
    <TestApp>
      <TopologyBuilderContextProvider>
        <MapContextWrapper contextValue={mapValue}>
          {children}
        </MapContextWrapper>
      </TopologyBuilderContextProvider>
    </TestApp>
  );
}

function mockMapboxTopologyBuilder() {
  const el = document.createElement('div');
  el.setAttribute('data-testid', 'topology-builder-mock');
  return {
    __el: el,
    onAdd: jest.fn(() => {
      return el;
    }),
    onRemove: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
  };
}
