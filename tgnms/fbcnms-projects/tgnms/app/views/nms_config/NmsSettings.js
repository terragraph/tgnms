/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Box from '@material-ui/core/Box';
import DatabaseSettings from './DatabaseSettings';
import Grid from '@material-ui/core/Grid';
import MapSettings from './MapSettings/MapSettings';
import MapStylesSettingsGroup from './MapStylesSettingsGroup';
import NmsBackup from './NmsBackup';
import NmsConfig from './NmsConfig';
import Paper from '@material-ui/core/Paper';
import SettingInput from './SettingInput';
import SettingsForm from './SettingsForm';
import SettingsFormHeading from './SettingsFormHeading';
import SettingsGroup from './SettingsGroup';
import SettingsTester from './SettingsTester';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';
import classnames from 'classnames';
import {Link, Redirect, Route, Switch, useRouteMatch} from 'react-router-dom';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
  },
  settingsContainer: {
    height: 'inherit',
  },
  viewContainer: {
    maxWidth: '1200px',
    marginLeft: theme.spacing(0.5),
    paddingTop: theme.spacing(5),
    padding: theme.spacing(3),
  },
  tabsContainer: {
    paddingLeft: theme.spacing(2),
    paddingTop: theme.spacing(5),
    color: theme.palette.text.secondary,
    boxShadow: theme.shadows[2],
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
  const view = match?.params?.view ?? defaultView;

  if (!isFeatureEnabled('NMS_SETTINGS_ENABLED')) {
    // if the feature is disabled, show the NmsConfig UI like before
    return (
      <Grid container className={classes.root}>
        <Switch>
          <Route path="/config/:networkName" component={NmsConfig} />
          <DefaultRedirect />
        </Switch>
      </Grid>
    );
  }
  return (
    <Paper classes={{root: classes.root}} square elevation={0}>
      <Grid container spacing={0} className={classes.settingsContainer}>
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
            {isFeatureEnabled('NMS_BACKUP_ENABLED') ? (
              <TabLink label="backup" value={'backup'} />
            ) : null}
            {isFeatureEnabled('LINK_BUDGETING_ENABLED') ? (
              <TabLink label="map profiles" value={'map'} />
            ) : null}
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
                    description="External services which NMS depends on to provide functionality"
                    Heading={SettingsFormHeading}>
                    <MapStylesSettingsGroup />
                    <SettingsGroup
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
                    </SettingsGroup>
                    <SettingsGroup
                      title="Stats"
                      tester={<SettingsTester keys={['PROMETHEUS']} />}>
                      <SettingInput
                        label="Prometheus URL"
                        setting="PROMETHEUS"
                      />
                      <SettingInput label="Grafana URL" setting="GRAFANA_URL" />
                      <SettingInput label="Kibana URL" setting="KIBANA_URL" />
                      <SettingInput
                        label="Elastic Search URL"
                        setting="ELASTIC_URL"
                      />
                      <SettingInput
                        label="Stats Max Delay (Seconds)"
                        setting="STATS_ALLOWED_DELAY_SEC"
                      />
                    </SettingsGroup>
                    <SettingsGroup
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
                    </SettingsGroup>
                    <SettingsGroup
                      title="Network Test"
                      tester={<SettingsTester keys={['NETWORKTEST_HOST']} />}>
                      <SettingInput
                        label="Enable Network Test"
                        setting="NETWORKTEST_ENABLED"
                      />
                      <SettingInput
                        label="Network Test URL"
                        setting="NETWORKTEST_HOST"
                      />
                    </SettingsGroup>
                    <SettingsGroup
                      title="Topology History"
                      tester={
                        <SettingsTester keys={['TOPOLOGY_HISTORY_HOST']} />
                      }>
                      <SettingInput
                        label="Enable Topology History"
                        setting="TOPOLOGY_HISTORY_ENABLED"
                      />
                      <SettingInput
                        label="Topology History URL"
                        setting="TOPOLOGY_HISTORY_HOST"
                      />
                    </SettingsGroup>
                    <SettingsGroup
                      title="Scan Service"
                      tester={<SettingsTester keys={['SCANSERVICE_HOST']} />}>
                      <SettingInput
                        label="Enable Scan Service"
                        setting="SCANSERVICE_ENABLED"
                      />
                      <SettingInput
                        label="Scan Service Host"
                        setting="SCANSERVICE_HOST"
                      />
                    </SettingsGroup>
                    <SettingsGroup
                      title="Historical Stats"
                      tester={
                        <SettingsTester
                          keys={['DEFAULT_ROUTES_HISTORY_HOST']}
                        />
                      }>
                      <SettingInput
                        label="Enable Historical Map Stats"
                        setting="MAP_HISTORY_ENABLED"
                      />
                      <SettingInput
                        label="Enable Default Routes History"
                        setting="DEFAULT_ROUTES_HISTORY_ENABLED"
                      />
                      <SettingInput
                        label="Default Routes History Host"
                        setting="DEFAULT_ROUTES_HISTORY_HOST"
                      />
                    </SettingsGroup>
                    <SettingsGroup
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
                    </SettingsGroup>
                    <SettingsGroup
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
                      <DatabaseSettings />
                    </SettingsGroup>
                    <SettingsGroup title="Controller">
                      <SettingInput
                        label="API Request Timeout"
                        setting="API_REQUEST_TIMEOUT"
                      />
                    </SettingsGroup>
                    <SettingsGroup title="Configuration Editing Views">
                      <SettingInput
                        isFeatureToggle
                        label="Form Edit View"
                        setting="FORM_CONFIG_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="Table Edit View"
                        setting="TABLE_CONFIG_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="JSON Edit View"
                        setting="JSON_CONFIG_ENABLED"
                      />
                    </SettingsGroup>
                    <SettingsGroup title="Network Planning">
                      <SettingInput
                        isFeatureToggle
                        label="Enable Network Planning"
                        setting="NETWORK_PLANNING_ENABLED"
                      />
                      <SettingInput
                        label="OAuth client_id"
                        setting="ANP_CLIENT_ID"
                      />
                      <SettingInput
                        label="OAuth client_secret"
                        setting="ANP_CLIENT_SECRET"
                      />
                      <SettingInput
                        label="Facebook OAuth URL"
                        setting="FACEBOOK_OAUTH_URL"
                      />
                      <SettingInput
                        label="ANP Partner ID"
                        setting="ANP_PARTNER_ID"
                      />
                      <SettingInput label="ANP API URL" setting="ANP_API_URL" />
                    </SettingsGroup>
                    <SettingsGroup title="Experimental Features">
                      <Box color="warning.main" m={2}>
                        <Typography>
                          Warning: Experimental features are incomplete and can
                          result in crashes or data loss.
                        </Typography>
                      </Box>
                      <SettingInput
                        isFeatureToggle
                        label="Map Annotations"
                        setting="MAP_ANNOTATIONS_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="Link Budgeting"
                        setting="LINK_BUDGETING_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="ODS Link Button"
                        setting="ODS_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="Alerts Map Layer"
                        setting="ALERTS_LAYER_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="Troubleshooting Tab"
                        setting="TROUBLESHOOTING_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="Troubleshooting Solution Automation"
                        setting="SOLUTION_AUTOMATION_ENABLED"
                      />
                      <SettingInput
                        isFeatureToggle
                        label="QoS Traffic Config"
                        setting="QOS_CONFIG"
                      />
                      <SettingInput
                        label="Onboarding Tutorial"
                        setting="NETWORK_TUTORIAL"
                        isFeatureToggle
                      />
                    </SettingsGroup>
                  </SettingsForm>
                )}
              />
              <Route path="/config/:networkName/backup" component={NmsBackup} />
              <Route path="/config/:networkName/map" component={MapSettings} />
              <DefaultRedirect />
            </Switch>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
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

function DefaultRedirect() {
  const match = useRouteMatch('/config/:networkName/:view?');
  const networkName = match?.params?.networkName ?? '_';
  return (
    <Redirect from="/config" to={`/config/${networkName}/${defaultView}`} />
  );
}
