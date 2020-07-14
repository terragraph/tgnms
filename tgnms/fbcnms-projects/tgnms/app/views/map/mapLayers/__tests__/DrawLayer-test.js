/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import * as mapApiUtilMock from '../../../../apiutils/MapAPIUtil';
import DrawLayer, {
  MAPBOX_DRAW_EVENTS,
  MAPBOX_TG_EVENTS,
  useDrawLayer,
  useMapAnnotationGroupState,
} from '../DrawLayer';
import {MapContextWrapper, TestApp} from '../../../../tests/testHelpers';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {act as hooksAct, renderHook} from '@testing-library/react-hooks';
import type {MapContext} from '../../../../contexts/MapContext';

import MapboxDrawMock from '@mapbox/mapbox-gl-draw';
jest.mock('@mapbox/mapbox-gl-draw');
jest.mock('../../../../apiutils/MapAPIUtil');
jest
  .spyOn(require('../../../../constants/FeatureFlags'), 'isFeatureEnabled')
  .mockReturnValue(true);

beforeEach(() => {
  MapboxDrawMock.mockClear();
  MapboxDrawMock.mockReset();
  cleanup();
});
describe('DrawLayer', () => {
  test('Renders button into mapboxControl', async () => {
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <DrawLayer />
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
      <Wrapper mapValue={{mapboxRef}}>
        <DrawLayer />
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
    const {__baseElement, ...mapboxRef} = mockMapboxRef();
    const {getByTestId} = await render(
      <Wrapper mapValue={{mapboxRef}}>
        <DrawLayer />
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
      <Wrapper mapValue={{mapboxRef}}>
        <DrawLayer />
      </Wrapper>,
      {container: document.body?.appendChild(__baseElement)},
    );
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(1);
    await act(async () => {
      // toggle it open
      mapboxRef.fire(MAPBOX_TG_EVENTS.TOGGLE);
    });
    // mapboxdraw will be the second control added after the drawlayer toggle
    expect(mapboxRef.addControl).toHaveBeenCalledTimes(2);
    expect(getByTestId('mapbox-gl-draw-mock')).toBeInTheDocument();
    expect(mapboxDrawMock.onAdd).toHaveBeenCalledTimes(1);

    await act(async () => {
      //toggle it closed
      mapboxRef.fire(MAPBOX_TG_EVENTS.TOGGLE);
    });
    expect(queryByTestId('mapbox-gl-draw-mock')).not.toBeInTheDocument();
    expect(mapboxDrawMock.onAdd).toHaveBeenCalledTimes(1);
    expect(mapboxDrawMock.onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('useMapAnnotationGroupState', () => {
  test('before group is loaded, empty feature collection is shown', async () => {
    const getGroupSpy = jest
      .spyOn(mapApiUtilMock, 'getAnnotationGroup')
      .mockResolvedValueOnce(null);
    const {result} = await renderHook(() =>
      useMapAnnotationGroupState({networkName: 'test', groupName: 'test'}),
    );
    expect(result.current.features).toMatchObject({
      type: 'FeatureCollection',
      features: [],
    });
    expect(getGroupSpy).toHaveBeenCalled();
  });
});

describe('useDrawLayer', () => {
  test('when mapbox draw creates an annotation, saves to the backend', async () => {
    const mapboxDrawMock = mockMapboxDraw();
    mapboxDrawMock.getAll.mockReturnValueOnce({
      type: 'FeatureCollection',
      features: [{type: 'Feature', geometry: {coordinates: [1, 0]}}],
    });
    const mapboxRef = mockMapboxRef();
    await renderHook(() => useDrawLayer(), {
      wrapper: props => <Wrapper {...props} mapValue={{mapboxRef}} />,
    });
    await hooksAct(async () => {
      mapboxRef.fire(MAPBOX_TG_EVENTS.TOGGLE);
    });
    expect(mapApiUtilMock.saveAnnotationGroup).not.toHaveBeenCalled();
    await hooksAct(async () => {
      mapboxRef.fire(MAPBOX_DRAW_EVENTS.CREATE, {});
    });
    expect(mapApiUtilMock.saveAnnotationGroup).toHaveBeenCalledWith({
      group: {
        geojson: JSON.stringify({
          type: 'FeatureCollection',
          features: [{type: 'Feature', geometry: {coordinates: [1, 0]}}],
        }),
        id: undefined,
        name: 'default',
      },
      networkName: '',
    });
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
      <MapContextWrapper contextValue={mapValue}>{children}</MapContextWrapper>
    </TestApp>
  );
}

function mockMapboxRef() {
  const EventEmitter = require('events');
  const emitter = new EventEmitter();
  const baseElement = document.createElement('div');
  const mapboxRef = {
    addControl: jest.fn(({onAdd}) => {
      const control = onAdd(mapboxRef);
      baseElement.appendChild(control);
    }),
    removeControl: jest.fn(({__el, onRemove}) => {
      onRemove(mapboxRef);
      baseElement.removeChild(__el);
    }),
    on: jest.fn((eventId, callback) => {
      emitter.on(eventId, callback);
    }),
    fire: jest.fn((eventId, arg) => {
      emitter.emit(eventId, arg);
    }),
    __baseElement: baseElement,
  };
  return mapboxRef;
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
  MapboxDrawMock.mockImplementationOnce(() => implementation);
  return implementation;
}
