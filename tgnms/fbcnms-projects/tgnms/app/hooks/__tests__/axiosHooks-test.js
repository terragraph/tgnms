/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
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
