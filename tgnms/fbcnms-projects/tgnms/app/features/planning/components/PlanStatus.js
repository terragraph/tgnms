/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Chip from '@material-ui/core/Chip';
import red from '@material-ui/core/colors/red';
import {PLAN_STATUS} from '@fbcnms/tg-nms/shared/dto/ANP';
import {makeStyles} from '@material-ui/styles';
import type {PlanStatus as PlanStatusType} from '@fbcnms/tg-nms/shared/dto/ANP';

const useStyles = makeStyles(theme => ({
  [PLAN_STATUS.IN_PREPARATION]: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[400],
  },
  [PLAN_STATUS.SCHEDULED]: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[400],
  },
  [PLAN_STATUS.RUNNING]: {
    backgroundColor: theme.palette.primary,
    color: 'white',
  },
  [PLAN_STATUS.SUCCEEDED]: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.main,
  },
  [PLAN_STATUS.FAILED]: {
    backgroundColor: red[100],
    color: red[400],
  },
  [PLAN_STATUS.KILLED]: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[400],
  },
}));

export default function PlanStatus({status}: {status: PlanStatusType}) {
  const classes = useStyles();
  return (
    <Chip
      label={status}
      classes={{root: classes[status] ?? classes[PLAN_STATUS.IN_PREPARATION]}}
      size="small"
    />
  );
}
