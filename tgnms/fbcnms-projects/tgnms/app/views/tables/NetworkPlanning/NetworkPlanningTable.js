/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import FoldersTable from './FoldersTable';
import PlansTable from './PlansTable';
import SitesFileTable from './SitesFileTable';
import TopologyTable from './TopologyTable';
import {
  PLANNING_BASE_PATH,
  PLANNING_FOLDER_PATH,
  PLANNING_PLAN_PATH,
  PLANNING_SITESFILE_PATH,
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

export default function NetworkPlanningTable(_props: NetworkTableProps) {
  const classes = useStyles();
  return (
    <div className={classes.root} data-testid="network-planning-table">
      <Route exact path={PLANNING_BASE_PATH} component={FoldersTable} />
      <Route exact path={PLANNING_FOLDER_PATH} component={PlansTable} />
      <Route exact path={PLANNING_PLAN_PATH} component={TopologyTable} />
      <Route exact path={PLANNING_SITESFILE_PATH} component={SitesFileTable} />
    </div>
  );
}
