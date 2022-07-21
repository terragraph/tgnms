/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import useLiveRef from '../useLiveRef';
import {renderHook} from '@testing-library/react-hooks';

describe('useLiveRef', () => {
  test('calling useLiveRef returns ref initiated to passed in val', () => {
    const {result} = renderHook(() => useLiveRef('testVal'));
    expect(result.current.current).toBe('testVal');
  });
});
