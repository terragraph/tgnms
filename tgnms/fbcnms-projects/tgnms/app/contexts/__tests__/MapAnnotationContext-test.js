/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as turf from '@turf/turf';
import {
  MapAnnotationContextProvider,
  useAnnotationGroups,
  useMapAnnotationContext,
} from '../MapAnnotationContext';
import {act, renderHook} from '@testing-library/react-hooks';
import {createMapboxDrawMap} from '@fbcnms/tg-nms/app/tests/mapHelpers';
import type {GeoFeature} from '@turf/turf';
import type {MapAnnotationContext} from '../MapAnnotationContext';
import type {MapAnnotationGroup} from '@fbcnms/tg-nms/shared/dto/MapAnnotations';
import type {RenderResult} from '@testing-library/react-hooks';

jest.mock('@fbcnms/tg-nms/app/apiutils/MapAPIUtil');
import * as mapAPIUtilMock from '@fbcnms/tg-nms/app/apiutils/MapAPIUtil';

const FEATURE_ID_1 = '1234';
const FEATURE_ID_2 = 456;

test('renders', () => {
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  expect(result.current.current).toBe(null);
  expect(result.current.selectedFeatures.length).toBe(0);
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
    result.current.setSelectedFeatureIds([FEATURE_ID_1]);
  });

  expect(result.current.selectedFeatures[0]).toMatchObject({
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

describe('updateFeatureProperties', () => {
  test(
    'selectedFeature should update if ' +
      'updating properties of the selected feature',
    () => {
      const {result, rerender} = renderCtxHook(() => useMapAnnotationContext());

      act(() => {
        const group = mockAnnotationGroup([
          turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
          turf.point([0, 1], {name: 'test-2'}, {id: FEATURE_ID_2}),
        ]);
        showGroup(result.current.__ctx, group);
      });
      act(() => {
        result.current.__ctx.setSelectedFeatureIds([FEATURE_ID_1]);
      });
      act(() => {
        result.current.updateFeatureProperties(FEATURE_ID_1, {
          name: 'test-1-edited',
        });
      });
      // rerender since selectedFeature is a context property
      act(rerender);
      expect(result.current.__ctx.selectedFeatures[0]?.properties.name).toBe(
        'test-1-edited',
      );
    },
  );

  test(
    'selectedFeature should not update if ' +
      'updating properties of a non-selected feature',
    () => {
      const {result, rerender} = renderCtxHook(() => useMapAnnotationContext());

      act(() => {
        const group = mockAnnotationGroup([
          turf.point([0, 0], {name: 'test-1'}, {id: FEATURE_ID_1}),
          turf.point([0, 1], {name: 'test-2'}, {id: FEATURE_ID_2}),
        ]);
        showGroup(result.current.__ctx, group);
      });
      act(() => {
        result.current.__ctx.setSelectedFeatureIds([FEATURE_ID_1]);
      });
      act(() => {
        result.current.updateFeatureProperties(FEATURE_ID_2, {
          name: 'test-2-edited',
        });
      });
      // rerender since selectedFeature is a context property
      act(rerender);
      expect(
        result.current.__ctx.drawControl.get(FEATURE_ID_2).properties.name,
      ).toBe('test-2-edited');
      expect(result.current.__ctx.selectedFeatures[0]?.properties.name).toBe(
        'test-1',
      );
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

    const {result, rerender} = renderCtxHook(() => useAnnotationGroups());

    await act(async () => {
      await result.current.loadGroup({name: 'testgroup'});
    });
    act(rerender);
    expect(result.current.__ctx.current).toMatchObject({
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

/**
 * helper to render a hook which extends the MapAnnotationContext(ctx).
 * drawControl needs to be added to the mock map
 */
function renderCtxHook<T>(
  hook: () => T,
): RenderResult<T & {__ctx: MapAnnotationContext}> {
  const r = renderHook(
    () => {
      return {
        __ctx: useMapAnnotationContext(),
        ...hook(),
      };
    },
    {
      wrapper: Wrapper,
    },
  );
  const map = createMapboxDrawMap();
  map.addControl(r.result.current.__ctx.drawControl);
  return r;
}

function showGroup(ctx: MapAnnotationContext, group: MapAnnotationGroup) {
  ctx.setCurrent(group);
  ctx.setIsDrawEnabled(true);
  ctx.drawControl.set(group.geojson);
}
