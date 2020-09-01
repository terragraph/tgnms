/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as turf from '@turf/turf';
import _MapAnnotationContext, {
  MapAnnotationContextProvider,
  useMapAnnotationContext,
} from '../MapAnnotationContext';
import {act, renderHook} from '@testing-library/react-hooks';
import {mockMapboxDraw} from '../../tests/testHelpers';
import type {GeoFeature} from '@turf/turf';
import type {MapAnnotationGroup} from '../../../shared/dto/MapAnnotations';

import MapboxDrawMock from '@mapbox/mapbox-gl-draw';
jest.mock('@mapbox/mapbox-gl-draw');
MapboxDrawMock.mockImplementation(mockMapboxDraw);

test('renders', () => {
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  expect(result.current.current).toBe(null);
  expect(result.current.selectedFeatureId).toBe(null);
});

xtest('updateFeatureProperty should also update selectedFeature', () => {
  MapboxDrawMock.mockImplementation(() =>
    mockMapboxDraw({
      get: () => ({
        test: '123',
      }),
    }),
  );
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  act(() => {
    result.current.setCurrent(
      mockAnnotationGroup([turf.point([0, 0], {name: 'test-1'}, {id: '123'})]),
    );
  });
  act(() => {
    result.current.setSelectedFeatureId('123');
  });
  expect(result.current.selectedFeature).toMatchObject({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [0, 0],
    },
    properties: {
      name: 'test-1',
    },
    id: '123',
  });
});

function Wrapper({children}) {
  return (
    <MapAnnotationContextProvider>{children}</MapAnnotationContextProvider>
  );
}

function mockAnnotationGroup(features: Array<GeoFeature>): MapAnnotationGroup {
  return {
    id: 1,
    topologyName: 'test',
    name: 'testgroup',
    geojson: turf.featureCollection(features),
  };
}
