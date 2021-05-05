/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import DrawToggle from '../DrawToggle';
import {MapAnnotationContextProvider} from '@fbcnms/tg-nms/app/contexts/MapAnnotationContext';
import {
  MapContextWrapper,
  TestApp,
  mockMapboxRef,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import type {MapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';

import MapboxDrawMock from '@mapbox/mapbox-gl-draw';
jest.mock('@mapbox/mapbox-gl-draw');
jest.mock('@fbcnms/tg-nms/app/apiutils/MapAPIUtil');
jest
  .spyOn(
    require('@fbcnms/tg-nms/app/constants/FeatureFlags'),
    'isFeatureEnabled',
  )
  .mockReturnValue(true);

beforeEach(() => {
  MapboxDrawMock.mockClear();
  MapboxDrawMock.mockReset();
});

describe('DrawToggle', () => {
  test('Renders button into mapboxControl', async () => {
    mockMapboxDraw();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      // $FlowIgnore It's a mock
      <Wrapper mapValue={{mapboxRef}}>
        <DrawToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-draw-toggle-container')).toBeInTheDocument();
    expect(getByTestId('tg-draw-toggle')).toBeInTheDocument();
  });

  test('clicking draw toggle adds/removes the button', async () => {
    mockMapboxDraw();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      // $FlowIgnore It's a mock
      <Wrapper mapValue={{mapboxRef}}>
        <DrawToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(getByTestId('tg-draw-toggle-container')).toBeInTheDocument();
    const toggle = getByTestId('tg-draw-toggle');
    expect(toggle).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(toggle);
    });
  });

  test('adds control', async () => {
    mockMapboxDraw();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      // $FlowIgnore It's a mock
      <Wrapper mapValue={{mapboxRef}}>
        <DrawToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalled();
    expect(getByTestId('tg-draw-toggle-container')).toBeInTheDocument();
  });

  test('toggles the draw control when mapbox dispatches tg.draw.toggle event', async () => {
    const mapboxDrawMock = mockMapboxDraw();
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId, queryByTestId} = await render(
      // $FlowIgnore It's a mock
      <Wrapper mapValue={{mapboxRef}}>
        <DrawToggle />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(getByTestId('tg-draw-toggle'));
    });
    // mapboxdraw will be the second control added after the drawToggle toggle
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(2);
    expect(getByTestId('mapbox-gl-draw-mock')).toBeInTheDocument();
    expect(mapboxDrawMock.onAdd).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.click(getByTestId('tg-draw-toggle'));
    });
    expect(queryByTestId('mapbox-gl-draw-mock')).not.toBeInTheDocument();
    expect(mapboxDrawMock.onAdd).toHaveBeenCalledTimes(1);
    expect(mapboxDrawMock.onRemove).toHaveBeenCalledTimes(1);
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
      <MapAnnotationContextProvider>
        <MapContextWrapper contextValue={mapValue}>
          {children}
        </MapContextWrapper>
      </MapAnnotationContextProvider>
    </TestApp>
  );
}

function mockMapboxDraw() {
  const el = document.createElement('div');
  el.setAttribute('data-testid', 'mapbox-gl-draw-mock');
  const implementation = {
    __el: el,
    onAdd: jest.fn(() => {
      return el;
    }),
    onRemove: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
  };
  MapboxDrawMock.mockImplementation(() => implementation);
  return implementation;
}
