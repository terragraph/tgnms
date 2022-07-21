/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import useUnmount from '../useUnmount';
import {renderHook} from '@testing-library/react-hooks';

describe('useUnmount', () => {
  test('calling useUnmount without unmounting component doesnt call function', () => {
    const testFn = jest.fn();
    function useTestHook() {
      useUnmount(testFn);
    }
    renderHook(() => useTestHook());
    expect(testFn).not.toHaveBeenCalled();
  });

  test('calling useUnmount and then unmounting component calls function', () => {
    const testFn = jest.fn();
    function useTestHook() {
      useUnmount(testFn);
    }
    const {unmount} = renderHook(() => useTestHook());
    unmount();
    expect(testFn).toHaveBeenCalled();
  });
});
