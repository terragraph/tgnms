/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';
import {MTableToolbar} from 'material-table';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  toolbarRoot: {
    paddingLeft: theme.spacing(2),
  },
}));
type CustomProps = {};
// props passed by untyped material-table
type MTableProps = {
  classes: {[string]: string},
};
type Props = {
  ...CustomProps,
  ...MTableProps,
};
export default function TableToolbar(props: Props) {
  const classes = useStyles();
  return (
    <MTableToolbar
      {...props}
      classes={{...props.classes, root: classes.toolbarRoot}}
    />
  );
}
