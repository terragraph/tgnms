/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import type {
  TaskState,
  TaskStateKey,
} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import type {TaskStateOptions} from '@fbcnms/tg-nms/app/hooks/useTaskState';

export type SetState<S> = {
  ((S => S) | S): void,
};

export type SetTaskState = TaskStateKey =>
  | void
  | (((curr: TaskStateKey) => TaskStateKey) => void);

export function useStateWithTaskState<U>(
  defaultValue: any,
  defaultState?: TaskStateOptions,
): {
  obj: U,
  setter: ((U => U) | U) => void,
  taskState: TaskState,
} {
  const [obj, setter] = React.useState<U>(defaultValue);
  const taskState = useTaskState(defaultState);
  return {
    obj,
    setter,
    taskState,
  };
}
