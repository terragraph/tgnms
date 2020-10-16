/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import useLiveRef from '../useLiveRef';
import {renderHook} from '@testing-library/react-hooks';

describe('useLiveRef', () => {
  test('calling useLiveRef returns ref initiated to passed in val', () => {
    const {result} = renderHook(() => useLiveRef('testVal'));
    expect(result.current.current).toBe('testVal');
  });
});
