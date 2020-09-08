/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as turf from '@turf/turf';
import {
  MapAnnotationContextProvider,
  useMapAnnotationContext,
} from '../MapAnnotationContext';
import {act, renderHook} from '@testing-library/react-hooks';
import {createMapboxDrawMap} from '../../tests/mapHelpers';
import type {GeoFeature} from '@turf/turf';
import type {MapAnnotationContext} from '../MapAnnotationContext';
import type {MapAnnotationGroup} from '../../../shared/dto/MapAnnotations';

jest.mock('../../apiutils/MapAPIUtil');
import * as mapAPIUtilMock from '../../apiutils/MapAPIUtil';

const FEATURE_ID_1 = '1234';
const FEATURE_ID_2 = 456;

test('renders', () => {
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  expect(result.current.current).toBe(null);
  expect(result.current.selectedFeatureId).toBe(null);
});

test('setSelectedFeatureId should update selectedFeature', () => {
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  const map = createMapboxDrawMap();
  map.addControl(result.current.drawControl);

  act(() => {
    const group = mockAnnotationGroup([
      turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
    ]);
    showGroup(result.current, group);
  });
  act(() => {
    result.current.setSelectedFeatureId(FEATURE_ID_1);
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
    id: FEATURE_ID_1,
  });
});

describe('updateFeatureProperty', () => {
  test(
    'selectedFeature should update if ' +
      'updating properties of the selected feature',
    () => {
      const {result, rerender} = renderHook(() => useMapAnnotationContext(), {
        wrapper: Wrapper,
      });
      const map = createMapboxDrawMap();
      map.addControl(result.current.drawControl);
      act(() => {
        const group = mockAnnotationGroup([
          turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
          turf.point([0, 1], {name: 'test-2'}, {id: FEATURE_ID_2}),
        ]);
        showGroup(result.current, group);
      });
      act(() => {
        result.current.setSelectedFeatureId(FEATURE_ID_1);
      });
      act(() => {
        result.current.updateFeatureProperty(
          FEATURE_ID_1,
          'name',
          'test-1-edited',
        );
      });
      // rerender since selectedFeature is a context property
      act(rerender);
      expect(result.current.selectedFeature?.properties.name).toBe(
        'test-1-edited',
      );
    },
  );

  test(
    'selectedFeature should not update if ' +
      'updating properties of a non-selected feature',
    () => {
      const {result, rerender} = renderHook(() => useMapAnnotationContext(), {
        wrapper: Wrapper,
      });
      const map = createMapboxDrawMap();
      map.addControl(result.current.drawControl);
      act(() => {
        const group = mockAnnotationGroup([
          turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
          turf.point([0, 1], {name: 'test-2'}, {id: FEATURE_ID_2}),
        ]);
        showGroup(result.current, group);
      });
      act(() => {
        result.current.setSelectedFeatureId(FEATURE_ID_1);
      });
      act(() => {
        result.current.updateFeatureProperty(
          FEATURE_ID_2,
          'name',
          'test-2-edited',
        );
      });
      // rerender since selectedFeature is a context property
      act(rerender);
      expect(result.current.drawControl.get(FEATURE_ID_2).properties.name).toBe(
        'test-2-edited',
      );
      expect(result.current.selectedFeature?.properties.name).toBe('test-1');
    },
  );
});

describe('loadGroup', () => {
  test('loads the group from the api, sets as current', async () => {
    const group = mockAnnotationGroup([
      turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
      turf.point([0, 1], {name: 'test-2'}, {id: FEATURE_ID_2}),
    ]);
    jest
      .spyOn(mapAPIUtilMock, 'getAnnotationGroup')
      .mockResolvedValueOnce(group);

    const {result, rerender} = renderHook(() => useMapAnnotationContext(), {
      wrapper: Wrapper,
    });
    const map = createMapboxDrawMap();
    map.addControl(result.current.drawControl);
    await act(async () => {
      await result.current.loadGroup({name: 'testgroup'});
    });
    act(rerender);
    expect(result.current.current).toMatchObject({
      name: 'testgroup',
    });
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

function showGroup(ctx: MapAnnotationContext, group: MapAnnotationGroup) {
  ctx.setCurrent(group);
  ctx.setIsDrawEnabled(true);
  ctx.drawControl.set(group.geojson);
}
