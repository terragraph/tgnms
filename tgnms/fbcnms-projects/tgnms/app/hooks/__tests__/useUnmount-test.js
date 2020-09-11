/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
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
