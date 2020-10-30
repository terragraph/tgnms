/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import AuditLog from './AuditLog';
import Grid from '@material-ui/core/Grid';
import React from 'react';
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
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  menuBar: {
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
    minWidth: 72,
    fontWeight: theme.typography.fontWeightRegular,
    fontSize: 16,
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
  expandButton: {
    float: 'right',
    margin: theme.spacing(2),
    padding: theme.spacing(1),
  },
  rotated: {
    transform: 'rotate(180deg)',
  },
  expandTableButton: {borderBottom: '1px solid #e8e8e8'},
}));

const DEFAULT_VIEW = 'auditLog';

export const TROUBLESHOOTING_TABS = {
  auditLog: 'Audit Log',
};

export default function Troubleshooting() {
  const classes = useStyles();

  const [selectedTable, setSelectedTable] = React.useState(
    TROUBLESHOOTING_TABS.auditLog,
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
        <Grid item xs={8}>
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
        </Grid>
      </Grid>
      <Grid item className={classes.viewRoot}>
        <Switch>
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
