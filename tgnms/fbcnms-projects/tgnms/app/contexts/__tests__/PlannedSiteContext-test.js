/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import {
  PlannedSiteContextProvider,
  usePlannedSiteContext,
} from '../PlannedSiteContext';
import {act, renderHook} from '@testing-library/react-hooks';

test('renders', () => {
  const {result} = renderHook(usePlannedSiteContext, {
    wrapper: PlannedSiteContextProvider,
  });
  expect(result.current.plannedSite).toBe(null);
});

test('setLocation updates the location', () => {
  const {result} = renderHook(usePlannedSiteContext, {
    wrapper: PlannedSiteContextProvider,
  });
  expect(result.current.plannedSite).toBe(null);
  act(() => {
    result.current.setLocation({latitude: 10, longitude: 5});
  });
  expect(result.current.plannedSite).toMatchObject({
    latitude: 10,
    longitude: 5,
    name: '',
  });

  act(() => {
    result.current.setLocation({latitude: 11, longitude: 3});
  });
  expect(result.current.plannedSite).toMatchObject({
    latitude: 11,
    longitude: 3,
    name: '',
  });
});

test('update updates the properties', () => {
  const {result} = renderHook(usePlannedSiteContext, {
    wrapper: PlannedSiteContextProvider,
  });
  expect(result.current.plannedSite).toBe(null);
  act(() => {
    result.current.update({name: 'test-site01', latitude: 10, longitude: 5});
  });
  expect(result.current.plannedSite).toMatchObject({
    latitude: 10,
    longitude: 5,
    name: 'test-site01',
  });
});
