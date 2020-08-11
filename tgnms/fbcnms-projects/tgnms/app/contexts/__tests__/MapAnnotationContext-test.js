/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import _MapAnnotationContext, {
  MapAnnotationContextProvider,
  useMapAnnotationContext,
} from '../MapAnnotationContext';
import {renderHook} from '@testing-library/react-hooks';

test('renders', () => {
  const {result} = renderHook(() => useMapAnnotationContext(), {
    wrapper: Wrapper,
  });
  expect(result.current.current).toBe(null);
  expect(result.current.selectedFeatureId).toBe(null);
});

function Wrapper({children}) {
  return (
    <MapAnnotationContextProvider>{children}</MapAnnotationContextProvider>
  );
}
