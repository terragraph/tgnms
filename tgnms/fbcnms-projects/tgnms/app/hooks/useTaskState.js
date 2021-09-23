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

export type TaskStateKey = $Keys<typeof TASK_STATE>;

export type TaskState = {|
  message: ?string,
  setMessage: (?string) => void | (((curr: ?string) => ?string) => void),
  state: TaskStateKey,
  setState: TaskStateKey =>
    | void
    | (((curr: TaskStateKey) => TaskStateKey) => void),
  reset: () => void,
  idle: () => void,
  loading: () => void,
  success: () => void,
  error: () => void,
  isInState: (state: TaskStateKey) => boolean,
  isInAnyState: (states: Array<TaskStateKey>) => boolean,
  isIdle: boolean,
  isLoading: boolean,
  isSuccess: boolean,
  isError: boolean,
  TASK_STATE: typeof TASK_STATE,
|};

export type TaskStateOptions = {
  initialState?: TaskStateKey,
};

export default function useTaskState(options?: TaskStateOptions): TaskState {
  const taskStateRef = React.useRef<TaskState>(({}: $Shape<TaskState>));
  const [state, setState] = React.useState<TaskStateKey>(
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
  const isInState = React.useCallback((s: TaskStateKey) => state === s, [
    state,
  ]);
  const isInAnyState = React.useCallback(
    (states: Array<TaskStateKey>) => {
      for (const s of states) {
        if (isInState(s)) {
          return true;
        }
      }
      return false;
    },
    [isInState],
  );

  // overwrite all the properties on the ref without breaking reference equality
  Object.assign(taskStateRef.current, {
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
  });
  return taskStateRef.current;
}
