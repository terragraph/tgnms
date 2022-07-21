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
import Chip from '@material-ui/core/Chip';
import red from '@material-ui/core/colors/red';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {makeStyles} from '@material-ui/styles';
import type {NetworkPlanStateType} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

const useStyles = makeStyles(theme => ({
  [NETWORK_PLAN_STATE.DRAFT]: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[400],
  },
  [NETWORK_PLAN_STATE.UPLOADING_INPUTS]: {
    backgroundColor: theme.palette.primary,
    color: 'white',
  },
  [NETWORK_PLAN_STATE.RUNNING]: {
    backgroundColor: theme.palette.primary,
    color: 'white',
  },
  [NETWORK_PLAN_STATE.SUCCESS]: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.main,
  },
  [NETWORK_PLAN_STATE.ERROR]: {
    backgroundColor: red[100],
    color: red[400],
  },
  [NETWORK_PLAN_STATE.LAUNCH_ERROR]: {
    backgroundColor: red[100],
    color: red[400],
  },
  [NETWORK_PLAN_STATE.CANCELLED]: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[400],
  },
}));

export default function PlanStatus({state}: {state: NetworkPlanStateType}) {
  const classes = useStyles();
  return (
    <Chip
      label={state}
      classes={{root: classes[state] ?? classes[NETWORK_PLAN_STATE.DRAFT]}}
      size="small"
    />
  );
}
