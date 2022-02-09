/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 */

import * as React from 'react';
import * as settingsApi from '@fbcnms/tg-nms/app/apiutils/SettingsAPIUtil';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Typography from '@material-ui/core/Typography';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import useTaskState from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {MILLISECONDS_TO_MINUTES} from '@fbcnms/tg-nms/app/constants/LayerConstants';

import type {TaskStateKey} from '@fbcnms/tg-nms/app/hooks/useTaskState';

/**
 * It may take a few seconds for NMS to actually go down for restart. Poll for
 * a down-state before polling for the up-state.
 */
export const RESTART_DETECTED_TIMEOUT = 5000;
/**
 * Time to wait for NMS to finish restart before considering it unhealthy.
 */
export const DEFAULT_ERROR_TIMEOUT = 1 * MILLISECONDS_TO_MINUTES;
export const POLL_INTERVAL = 500;

type RestartWatcher = {|
  /**
   * Start polling the NMS for when it's back online
   */
  start: () => *,
  state: TaskStateKey,
|};
export function useRestartWatcher(conf: ?{timeout: number}): RestartWatcher {
  const {timeout} = conf || {timeout: DEFAULT_ERROR_TIMEOUT};
  const taskState = useTaskState();
  const taskStateRef = useLiveRef(taskState);
  const errorTimeoutIdRef = React.useRef<?TimeoutID>(null);
  const pollTimeoutIDRef = React.useRef<?TimeoutID>(null);
  const start = React.useCallback(async () => {
    taskStateRef.current.loading();
    errorTimeoutIdRef.current = setTimeout(() => {
      // if NMS is not restarted before timeout, report an error but keep trying
      if (taskStateRef.current.isInState('LOADING')) {
        taskStateRef.current.error();
      }
    }, timeout);
    const startTimeMS = new Date().getTime();
    for (;;) {
      // first, poll until NMS does not respond, this means it has restarted
      await new Promise(
        res => (pollTimeoutIDRef.current = setTimeout(res, POLL_INTERVAL)),
      );
      const status = await settingsApi.checkRestartStatus({
        timeout: POLL_INTERVAL,
      });
      if (!status) {
        break;
      }
      if (new Date().getTime() - startTimeMS > RESTART_DETECTED_TIMEOUT) {
        console.warn(
          `NMS restart not detected after ${
            RESTART_DETECTED_TIMEOUT / 1000
          } seconds`,
        );
        break;
      }
    }
    // next, poll until it comes back online
    for (;;) {
      await new Promise(
        res => (pollTimeoutIDRef.current = setTimeout(res, POLL_INTERVAL)),
      );
      const status = await settingsApi.checkRestartStatus({
        timeout: POLL_INTERVAL,
      });
      if (status) {
        taskStateRef.current.success();
        clearTimeout(errorTimeoutIdRef.current);
        break;
      }
    }
  }, [taskStateRef, timeout, errorTimeoutIdRef]);
  React.useEffect(
    () => () => {
      // fixes setState while unmounted warnings in tests
      if (errorTimeoutIdRef.current != null) {
        clearTimeout(errorTimeoutIdRef.current);
      }
      if (pollTimeoutIDRef.current != null) {
        clearTimeout(pollTimeoutIDRef.current);
      }
    },
    [errorTimeoutIdRef],
  );
  return {
    start,
    state: taskState.state,
  };
}

export default function RestartWatcherModal({
  watcher,
}: {
  watcher: RestartWatcher,
}) {
  const restartTimeoutRef = React.useRef<?TimeoutID>(null);
  React.useEffect(() => {
    if (
      watcher.state === 'SUCCESS' &&
      typeof restartTimeoutRef.current !== 'number'
    ) {
      restartTimeoutRef.current = setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [restartTimeoutRef, watcher.state]);

  return (
    <MaterialModal
      open={watcher.state !== 'IDLE'}
      data-testid="restart-watcher-modal"
      modalTitle={
        watcher.state === 'SUCCESS' ? 'Restart successful' : 'NMS Is Restarting'
      }
      modalContent={
        <Grid
          container
          direction="column"
          spacing={2}
          justifyContent="center"
          alignItems="center">
          {watcher.state !== 'SUCCESS' && (
            <>
              <Grid item>
                <CircularProgress />
              </Grid>
              <Grid item data-testid="loading-status">
                <Typography variant="body2" color="textSecondary">
                  Waiting for restart to complete...
                </Typography>
              </Grid>
            </>
          )}
          {watcher.state === 'ERROR' && (
            <Grid item data-testid="error-status">
              <Typography variant="body2" color="error">
                NMS restart is taking longer than expected...
              </Typography>
            </Grid>
          )}
          {watcher.state === 'SUCCESS' && (
            <Grid item data-testid="success-status">
              <Typography variant="body2" color="textSecondary">
                Restart successful. The page will automatically refresh.
              </Typography>
            </Grid>
          )}
        </Grid>
      }
    />
  );
}
