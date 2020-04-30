/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Grid from '@material-ui/core/Grid';
import NmsConfig from './NmsConfig';
import Paper from '@material-ui/core/Paper';
import SettingInput from './SettingInput';
import SettingsForm from './SettingsForm';
import SettingsTester from './SettingsTester';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';
import classnames from 'classnames';
import {Link, Redirect, Route, Switch, useRouteMatch} from 'react-router-dom';
import {isFeatureEnabled} from '../../constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  viewContainer: {
    padding: theme.spacing(3),
  },
  tabsContainer: {
    marginTop: theme.spacing(3),
    borderRight: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
  },
  tabs: {
    width: '100%',
  },
  tab: {
    padding: `${theme.spacing(0)}px ${theme.spacing(3)}px`,
    fontSize: '1rem',
    textTransform: 'capitalize',
    minHeight: 45,
  },
  tabLabel: {
    alignItems: 'flex-start',
    fontSize: theme.typography.body1.fontSize,
  },
  titleTab: {
    color: theme.palette.text.primary,
    cursor: 'default',
    minHeight: 35,
    opacity: 1.0,
  },
}));

const defaultView = 'networks';
export default function NmsSettings() {
  const classes = useStyles();
  const match = useRouteMatch('/config/:networkName/:view?');
  const networkName = match?.params?.networkName ?? '_';
  const view = match?.params?.view ?? defaultView;
  if (!isFeatureEnabled('NMS_SETTINGS_ENABLED')) {
    // if the feature is disabled, show the NmsConfig UI like before
    return (
      <Grid container className={classes.root}>
        <Route path="/config/:networkName" component={NmsConfig} />
      </Grid>
    );
  }
  return (
    <Paper classes={{root: classes.root}} elevation={1}>
      <Grid container spacing={0}>
        <Grid
          container
          item
          xs={2}
          classes={{root: classes.tabsContainer}}
          direction="column"
          alignItems="flex-start">
          <Title title="settings" />
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={view}
            classes={{root: classes.tabs}}>
            <TabLink label="networks" value={'networks'} />
            <TabLink label="services" value={'services'} />
          </Tabs>
        </Grid>
        <Grid item xs={10}>
          <Paper classes={{root: classes.viewContainer}} elevation={0}>
            <Switch>
              <Route
                path="/config/:networkName/networks"
                component={NmsConfig}
              />
              <Route
                path="/config/:networkName/services"
                render={() => (
                  <SettingsForm
                    title="Services"
                    description="External services which NMS depends on to provide functionality">
                    <SettingGroup title="Nodeupdate">
                      <SettingInput
                        label="Nodeupdate URL"
                        setting="NODEUPDATE_SERVER_URL"
                      />
                      <SettingInput
                        label="Nodeupdate Auth Token"
                        setting="NODEUPDATE_AUTH_TOKEN"
                      />
                    </SettingGroup>
                    <SettingGroup
                      title="Software Portal"
                      tester={
                        <SettingsTester
                          keys={[
                            'SOFTWARE_PORTAL_URL',
                            'SOFTWARE_PORTAL_API_TOKEN',
                            'SOFTWARE_PORTAL_API_ID',
                          ]}
                        />
                      }>
                      <SettingInput
                        isFeatureToggle
                        label="Software Portal Enabled"
                        setting="SOFTWARE_PORTAL_ENABLED"
                      />
                      <SettingInput
                        label="Software Portal URL"
                        setting="SOFTWARE_PORTAL_URL"
                      />
                      <SettingInput
                        label="Software Portal API Token"
                        setting="SOFTWARE_PORTAL_API_TOKEN"
                      />
                      <SettingInput
                        label="Software Portal API ID"
                        setting="SOFTWARE_PORTAL_API_ID"
                      />
                    </SettingGroup>
                    <SettingGroup
                      title="Alarms"
                      tester={
                        <SettingsTester
                          keys={[
                            'PROMETHEUS_CONFIG_URL',
                            'ALERTMANAGER_CONFIG_URL',
                            'ALERTMANAGER_URL',
                            'TG_ALARM_URL',
                          ]}
                        />
                      }>
                      <SettingInput
                        isFeatureToggle
                        label="Alarms Enabled"
                        setting="ALARMS_ENABLED"
                      />
                      <SettingInput
                        label="Prometheus Configurer URL"
                        setting="PROMETHEUS_CONFIG_URL"
                      />
                      <SettingInput
                        label="Alertmanager Configurer URL"
                        setting="ALERTMANAGER_CONFIG_URL"
                      />
                      <SettingInput
                        label="Alertmanager URL"
                        setting="ALERTMANAGER_URL"
                      />
                      <SettingInput
                        label="Terragraph Event Alarms Service URL"
                        setting="TG_ALARM_URL"
                      />
                    </SettingGroup>
                    <SettingGroup
                      title="Authentication"
                      tester={
                        <SettingsTester
                          keys={[
                            'KEYCLOAK_HTTP_PROXY',
                            'KEYCLOAK_HOST',
                            'KEYCLOAK_REALM',
                            'KEYCLOAK_CLIENT_ID',
                            'KEYCLOAK_CLIENT_SECRET',
                            'CLIENT_ROOT_URL',
                          ]}
                        />
                      }>
                      <SettingInput
                        label="Authentication Enabled"
                        setting="LOGIN_ENABLED"
                        isFeatureToggle
                      />
                      <SettingInput
                        label="Keycloak Realm"
                        setting="KEYCLOAK_REALM"
                      />
                      <SettingInput
                        label="Keycloak Client ID"
                        setting="KEYCLOAK_CLIENT_ID"
                      />
                      <SettingInput
                        label="Keycloak Client Secret"
                        setting="KEYCLOAK_CLIENT_SECRET"
                      />
                      <SettingInput
                        label="Keycloak Host"
                        setting="KEYCLOAK_HOST"
                      />
                      <SettingInput
                        label="NMS Client Root URL"
                        setting="CLIENT_ROOT_URL"
                      />
                      <SettingInput
                        label="Keycloak HTTP Proxy"
                        setting="KEYCLOAK_HTTP_PROXY"
                      />
                    </SettingGroup>
                    <SettingGroup
                      title="Database"
                      tester={
                        <SettingsTester
                          keys={[
                            'MYSQL_HOST',
                            'MYSQL_DB',
                            'MYSQL_USER',
                            'MYSQL_PORT',
                            'MYSQL_PASS',
                          ]}
                        />
                      }>
                      <SettingInput label="MySQL Host" setting="MYSQL_HOST" />
                      <SettingInput label="MySQL Database" setting="MYSQL_DB" />
                      <SettingInput label="MySQL User" setting="MYSQL_USER" />
                      <SettingInput label="MySQL Port" setting="MYSQL_PORT" />
                      <SettingInput
                        label="MySQL Password"
                        setting="MYSQL_PASS"
                      />
                    </SettingGroup>
                    <SettingGroup title="Controller">
                      <SettingInput
                        label="API Request Timeout"
                        setting="API_REQUEST_TIMEOUT"
                      />
                    </SettingGroup>
                  </SettingsForm>
                )}
              />

              <Redirect
                from="/config"
                to={`/config/${networkName}/${defaultView}`}
              />
            </Switch>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
}

/**
 * A group of settings which are edited and tested together. ex:
 * MYSQL
 *  MYSQL_HOST,MYSQL_PASS,MYSQL_USER
 * */
function SettingGroup({
  title,
  children,
  tester,
}: {
  title: React.Node,
  children: React.Node,
  tester?: React.Node,
}) {
  return (
    <Grid item>
      <Card>
        <CardHeader title={<Typography variant="h6">{title}</Typography>} />
        <CardContent>
          <Grid container direction="column" spacing={3}>
            {children}
            {tester && (
              <Grid item container justify="flex-end">
                {tester}
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
}

function Title({title}: {title: string}) {
  const classes = useStyles();
  return (
    <Tab
      classes={{
        root: classnames(classes.tab, classes.titleTab),
        wrapper: classes.tabLabel,
      }}
      label={title}
      disableRipple
      disableFocusRipple
      component={Typography}
    />
  );
}

function TabLink(props: {value: string}) {
  const classes = useStyles();
  return (
    <Tab
      {...props}
      classes={{root: classes.tab, wrapper: classes.tabLabel}}
      component={Link}
      to={props.value}
    />
  );
}
