/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import AppBar from '@material-ui/core/AppBar';
import AuditLog from './AuditLog';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import RootCause from './RootCause';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {Link, Redirect, Route, Switch, useRouteMatch} from 'react-router-dom';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  viewRoot: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'row',
  },
  appBar: {
    position: 'inherit',
  },
  menuBar: {
    zIndex: theme.zIndex.appBar,
    paddingRight: theme.spacing(1),
  },
  tabsRoot: {
    flex: '0 1 auto',
    marginBottom: theme.spacing(),
    paddingTop: theme.spacing(),
    paddingLeft: theme.spacing(),
  },
  tabsIndicator: {
    backgroundColor: '#1890ff',
  },
  tabRoot: {
    textTransform: 'initial',
    minWidth: theme.spacing(9),
    fontWeight: theme.typography.fontWeightRegular,
    fontSize: theme.spacing(2),
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&$tabSelected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
}));

const DEFAULT_VIEW = 'rootCause';

export const TROUBLESHOOTING_TABS = {
  rootCause: 'Root Cause Analysis',
  auditLog: 'Audit Log',
};

export default function Troubleshooting() {
  const classes = useStyles();

  const [selectedTable, setSelectedTable] = React.useState(
    TROUBLESHOOTING_TABS[DEFAULT_VIEW],
  );

  const handleTabChange = React.useCallback(
    (event, newTab) => {
      setSelectedTable(newTab);
    },
    [setSelectedTable],
  );

  return (
    <Grid container className={classes.root}>
      <Grid item container className={classes.menuBar}>
        <Grid item xs={12}>
          <AppBar className={classes.appBar} color="default">
            <Tabs
              value={selectedTable}
              onChange={handleTabChange}
              classes={{
                root: classes.tabsRoot,
                indicator: classes.tabsIndicator,
              }}>
              {Object.keys(TROUBLESHOOTING_TABS).map(troubleshootingTab => (
                <Tab
                  key={troubleshootingTab}
                  classes={{root: classes.tabRoot}}
                  disableRipple
                  label={TROUBLESHOOTING_TABS[troubleshootingTab]}
                  value={TROUBLESHOOTING_TABS[troubleshootingTab]}
                  component={Link}
                  to={troubleshootingTab}
                />
              ))}
            </Tabs>
          </AppBar>
        </Grid>
      </Grid>
      <Grid item className={classes.viewRoot}>
        <Switch>
          <Route
            path="/troubleshooting/:networkName/rootCause"
            component={RootCause}
          />
          <Route
            path="/troubleshooting/:networkName/auditLog"
            component={AuditLog}
          />
          <DefaultRedirect />
        </Switch>
      </Grid>
    </Grid>
  );
}

function DefaultRedirect() {
  const match = useRouteMatch('/troubleshooting/:networkName/:view?');
  const networkName = match?.params?.networkName ?? '_';
  return (
    <Redirect
      from="/troubleshooting"
      to={`/troubleshooting/${networkName}/${DEFAULT_VIEW}`}
    />
  );
}
