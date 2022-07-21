/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */
import * as React from 'react';
import Paper from '@material-ui/core/Paper';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(),
    margin: theme.spacing(),
    border: '1px solid #e0e0e0',
  },
}));

export default function UpgradeSection({
  children,
  ...props
}: {
  children: React.Node,
}) {
  const classes = useStyles();
  return (
    <Paper {...props} elevation={0} className={classes.root}>
      {children}
    </Paper>
  );
}
