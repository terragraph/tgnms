/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import * as React from 'react';
import MapOverlayLegend from '../MapOverlayLegend';
import {MapContextWrapper, TestApp} from '../../../tests/testHelpers';
import {cleanup, render} from '@testing-library/react';

import MapboxDrawMock from '@mapbox/mapbox-gl-draw';
jest.mock('@mapbox/mapbox-gl-draw');

beforeEach(() => {
  MapboxDrawMock.mockClear();
  MapboxDrawMock.mockReset();
  cleanup();
});

test('Renders legend container into mapboxControl', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByTestId} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <MapOverlayLegend />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByTestId('tg-legend-container')).toBeInTheDocument();
});

test('Renders legend in container ', async () => {
  const {__baseElement, ...mapboxRef} = mockMapboxRef();
  const {getByText} = await render(
    <TestApp>
      {/* $FlowIgnore It's a mock */}
      <MapContextWrapper contextValue={{mapboxRef}}>
        <MapOverlayLegend />
      </MapContextWrapper>
    </TestApp>,
    {container: document.body?.appendChild(__baseElement)},
  );
  expect(getByText('Legend')).toBeInTheDocument();
});

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
