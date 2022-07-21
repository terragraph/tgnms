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
import useTaskState, {TASK_STATE} from '../useTaskState';
import {act, renderHook} from '@testing-library/react-hooks';

describe('useTaskState', () => {
  test('calling useTaskState returns modal state initiated', () => {
    const {result} = renderHook(() => useTaskState());
    expect(result.current.state).toBe(result.current.TASK_STATE.IDLE);
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test('useTaskState can set message', () => {
    const {result} = renderHook(() => useTaskState());
    expect(result.current.message).toBe(null);

    act(() => {
      result.current.setMessage('testMessage');
    });
    expect(result.current.message).toBe('testMessage');
  });

  test('useTaskState reset resets state and message', () => {
    const {result} = renderHook(() => useTaskState());
    act(() => {
      result.current.setMessage('testMessage');
      result.current.setState(result.current.TASK_STATE.SUCCESS);
    });
    expect(result.current.message).toBe('testMessage');
    expect(result.current.state).toBe(result.current.TASK_STATE.SUCCESS);
    act(() => {
      result.current.reset();
    });
    expect(result.current.message).toBe(null);
    expect(result.current.state).toBe(result.current.TASK_STATE.IDLE);
  });

  test('return value never breaks reference equality', () => {
    const spy = jest.fn();
    expect(spy).toHaveBeenCalledTimes(0);
    const {result, rerender} = renderHook(() => {
      const taskState = useTaskState();
      React.useEffect(() => {
        spy();
      }, [taskState]);
      return taskState;
    });
    const result1 = result.current;
    expect(spy).toHaveBeenCalledTimes(1);
    // rerender with no state change
    act(() => {
      rerender();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result1 === result.current).toBe(true);
    // now change something
    act(() => {
      result.current.setState(TASK_STATE.LOADING);
    });
    act(() => {
      rerender();
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result1 === result.current).toBe(true);
  });
});
