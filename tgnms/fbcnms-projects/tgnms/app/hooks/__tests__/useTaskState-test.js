/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import 'jest-dom/extend-expect';
import useTaskState from '../useTaskState';
import {act, renderHook} from '@testing-library/react-hooks';

describe('useTaskState', () => {
  test('calling useTaskState returns modal state initiated', () => {
    const {result} = renderHook(() => useTaskState());
    expect(result.current.state).toBe(result.current.TASK_STATE.IDLE);
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test(' useTaskState can set message', () => {
    const {result} = renderHook(() => useTaskState());
    expect(result.current.message).toBe(null);

    act(() => {
      result.current.setMessage('testMessage');
    });
    expect(result.current.message).toBe('testMessage');
  });

  test(' useTaskState reset resets state and message', () => {
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
});
