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
import {useConfirmationModalState, useModalState} from '../modalHooks';

jest.mock('mapbox-gl', () => ({
  Map: () => ({}),
}));

describe('useConfirmationModalState', () => {
  test('calling useConfirmationModalState returns modal state initiated to false', () => {
    const {result} = renderHook(() => useConfirmationModalState());
    expect(result.current.isOpen).toBe(false);
  });

  test('requestConfirmation opens modal', () => {
    const {result} = renderHook(() => useConfirmationModalState());
    expect(result.current.isOpen).toBe(false);
    act(() => {
      result.current.requestConfirmation(jest.fn());
    });
    expect(result.current.isOpen).toBe(true);
  });

  test('confirm closes modal and calls confirmation passed by requestConfirmation', () => {
    const {result} = renderHook(() => useConfirmationModalState());
    expect(result.current.isOpen).toBe(false);
    const testConf = jest.fn();
    act(() => {
      result.current.requestConfirmation(testConf);
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.confirm();
    });
    expect(result.current.isOpen).toBe(false);
    expect(testConf).toHaveBeenCalled();
  });

  test('cancel closes modal and does not call confirmation', () => {
    const {result} = renderHook(() => useConfirmationModalState());
    expect(result.current.isOpen).toBe(false);
    const testConf = jest.fn();

    act(() => {
      result.current.requestConfirmation(testConf);
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.cancel();
    });
    expect(result.current.isOpen).toBe(false);
    expect(testConf).not.toHaveBeenCalled();
  });
});

describe('useModalState', () => {
  test('calling useModalState initializes isOpen to false', () => {
    const {result} = renderHook(() => useModalState());
    expect(result.current.isOpen).toBe(false);
  });

  test('open opens', () => {
    const {result} = renderHook(() => useModalState());
    expect(result.current.isOpen).toBe(false);
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  test('close closes', () => {
    const {result} = renderHook(() => useModalState());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
