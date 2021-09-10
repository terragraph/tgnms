/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import Grid from '@material-ui/core/Grid';
import React from 'react';
import {MTableAction, MTableToolbar} from '@material-table/core';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  toolbarRoot: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
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

export type TableToolbarActionProps = {|
  action: {
    Component?: React.Component<*>,
  },
|};
/**
 * Allows overriding the entire component for an action. By default, an
 * iconbutton is rendered.
 */
export function TableToolbarAction(props: TableToolbarActionProps) {
  const {action} = props;
  if (typeof action.Component === 'function') {
    const {Component} = action;
    return <Component {...props} />;
  }
  return <MTableAction {...props} />;
}

/**
 * Used to provide spacing between a group of overridden buttons.
 * This isn't needed if the Component field isn't used for individual actions.
 */
export type TableToolbarActionsProps = {
  actions: Array<Object>,
  components: Object,
  data: Object,
  size: string,
  disabled: boolean,
};
export function TableToolbarActions({
  actions,
  components,
  ...props
}: TableToolbarActionsProps) {
  return (
    <Grid container spacing={2}>
      {actions.map((action, idx) => (
        <Grid item key={'action-' + idx}>
          <components.Action
            action={action}
            data={props.data}
            size={props.size}
            disabled={props.disabled}
          />
        </Grid>
      ))}
    </Grid>
  );
}
