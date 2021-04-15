/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import FoldersTable from './FoldersTable';
import PlansTable from './PlansTable';
import React from 'react';
import {BASE_PATH, FOLDER_PATH} from './planningPaths';
import {Route} from 'react-router-dom';
import {makeStyles} from '@material-ui/styles';
import type {NetworkTableProps} from '../NetworkTables';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    overflow: 'auto',
  },
  toolbarRoot: {
    paddingLeft: theme.spacing(2),
  },
}));

export default function NetworkPlanningTable({tableHeight}: NetworkTableProps) {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <Route
        exact
        path={BASE_PATH}
        render={_props => <FoldersTable tableHeight={tableHeight} />}
      />
      <Route
        path={FOLDER_PATH}
        render={_props => <PlansTable tableHeight={tableHeight} />}
      />
    </div>
  );
}
