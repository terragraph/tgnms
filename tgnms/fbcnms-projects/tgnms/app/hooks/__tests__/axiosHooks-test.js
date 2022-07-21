/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import {act, renderHook} from '@testing-library/react-hooks';
import {useCancelToken} from '../axiosHooks';

jest.mock('mapbox-gl', () => ({
  Map: () => ({}),
}));

describe('useCancelToken', () => {
  test('calling useCancel token returns a cancelToken', () => {
    const {result} = renderHook(() => useCancelToken());
    expect(result.current.cancelToken);
  });

  test('reset changes cancel token', () => {
    const {result} = renderHook(() => useCancelToken());
    const initialToken = result.current.cancelToken;
    expect(result.current.cancelToken);

    act(() => {
      result.current.reset();
    });
    expect(result.current.cancelToken !== initialToken);
  });
});
