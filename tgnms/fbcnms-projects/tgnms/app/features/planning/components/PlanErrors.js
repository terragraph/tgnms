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
import * as networkPlanningAPIUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import Alert from '@material-ui/lab/Alert';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';

import type {
  NetworkPlan,
  PlanError,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export default function PlanErrors({plan}: {plan: NetworkPlan}) {
  const {isLoading, setState} = useTaskState();
  const [errors, setErrors] = React.useState<?Array<PlanError>>();
  React.useEffect(() => {
    (async () => {
      try {
        setState(TASK_STATE.LOADING);
        const errors = await networkPlanningAPIUtil.getPlanErrors({
          id: plan.id,
        });
        if (errors.length > 0) {
          setErrors(errors);
        } else {
          /**
           * if there are no error messages, an unknown error has occurred,
           * usually an infrastructure error so just show a generic msg
           */
          setErrors([{error_message: 'An unknown error has occurred'}]);
        }
        setState(TASK_STATE.SUCCESS);
      } catch (err) {
        setState(TASK_STATE.ERROR);
      }
    })();
  }, [plan, setState]);
  return (
    <Grid item container direction="column">
      <Grid item>
        <Alert color="error" severity="error">
          <Grid item container direction="column">
            <Grid item>
              <Typography>Plan Failed</Typography>
            </Grid>
            {errors &&
              errors.map(({error_message}) => (
                <Grid item>{error_message}</Grid>
              ))}
          </Grid>
        </Alert>
      </Grid>
      {isLoading && (
        <Grid>
          <CircularProgress size={10} />
        </Grid>
      )}
    </Grid>
  );
}
