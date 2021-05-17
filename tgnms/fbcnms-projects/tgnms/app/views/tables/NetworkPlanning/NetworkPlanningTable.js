/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import FoldersTable from './FoldersTable';
import PlansTable from './PlansTable';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
} from '@fbcnms/tg-nms/app/constants/paths';
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
    <div className={classes.root} data-testid="network-planning-table">
      <Route
        exact
        path={PLANNING_BASE_PATH}
        render={_props => <FoldersTable tableHeight={tableHeight} />}
      />
      <Route
        path={PLANNING_FOLDER_PATH}
        render={_props => <PlansTable tableHeight={tableHeight} />}
      />
    </div>
  );
}
