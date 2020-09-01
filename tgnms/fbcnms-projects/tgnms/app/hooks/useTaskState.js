/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 *
 * state-machine hook to manage the UI of long-running tasks such as
 * http requests
 */

import * as React from 'react';

export const TASK_STATE = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
};

export type TaskState = $Values<typeof TASK_STATE>;
export default function useTaskState(options?: {initialState?: TaskState}) {
  const [state, setState] = React.useState<TaskState>(
    options?.initialState ?? TASK_STATE.IDLE,
  );
  const [message, setMessage] = React.useState<?string>(null);
  const reset = React.useCallback(() => {
    setState(TASK_STATE.IDLE);
    setMessage(null);
  }, []);
  const idle = React.useCallback(() => setState(TASK_STATE.IDLE), []);
  const loading = React.useCallback(() => setState(TASK_STATE.LOADING), []);
  const success = React.useCallback(() => setState(TASK_STATE.SUCCESS), []);
  const error = React.useCallback(() => setState(TASK_STATE.ERROR), []);
  const isInState = React.useCallback((s: TaskState) => state === s, [state]);
  const isInAnyState = React.useCallback(
    (states: Array<TaskState>) => {
      for (const s of states) {
        if (isInState(s)) {
          return true;
        }
      }
      return false;
    },
    [isInState],
  );
  return {
    message,
    setMessage,
    state,
    setState,
    reset,
    idle,
    loading,
    success,
    error,
    isInState,
    isInAnyState,
    isIdle: state === TASK_STATE.IDLE,
    isLoading: state === TASK_STATE.LOADING,
    isSuccess: state === TASK_STATE.SUCCESS,
    isError: state === TASK_STATE.ERROR,
    TASK_STATE,
  };
}
