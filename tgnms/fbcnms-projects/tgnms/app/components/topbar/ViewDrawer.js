/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AlarmIcon from '@material-ui/icons/Alarm';
import BuildIcon from '@material-ui/icons/Build';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import DashboardIcon from '@material-ui/icons/Dashboard';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import GetAppIcon from '@material-ui/icons/GetApp';
import InfoMenu from '@fbcnms/tg-nms/app/components/topbar/InfoMenu/InfoMenu';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MUINavLink from '@fbcnms/tg-nms/app/components/topbar/MUINavLink';
import MapIcon from '@material-ui/icons/Map';
import React from 'react';
import SettingsIcon from '@material-ui/icons/Settings';
import TableChartIcon from '@material-ui/icons/TableChart';
import TimelineIcon from '@material-ui/icons/Timeline';
import Tooltip from '@material-ui/core/Tooltip';
import classNames from 'classnames';
import {isAuthorized} from '@fbcnms/tg-nms/app/helpers/UserHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {useNetworkListContext} from '@fbcnms/tg-nms/app/contexts/NetworkListContext';

// View names, icons, and routes
// NOTE: When adding/removing views, also update NetworkUI::renderRoutes()
const VIEWS = [
  {name: 'Map', icon: <MapIcon />, viewName: 'map'},
  {name: 'Tables', icon: <TableChartIcon />, viewName: 'tables'},
  {
    name: 'Dashboards',
    icon: <DashboardIcon />,
    viewName: 'dashboards',
    hideCondition: () => !isFeatureEnabled('GRAFANA_ENABLED'),
  },
  {
    name: 'Troubleshooting',
    icon: <TimelineIcon />,
    viewName: 'troubleshooting',
    hideCondition: () => !isFeatureEnabled('TROUBLESHOOTING_ENABLED'),
  },
  {
    name: 'Alerts',
    icon: <AlarmIcon />,
    viewName: 'alarms',
    hideCondition: () => !isFeatureEnabled('ALARMS_ENABLED'),
  },
  {
    name: 'Upgrade',
    icon: <CloudUploadIcon />,
    viewName: 'upgrade',
    hideCondition: () => !isAuthorized(['UPGRADE_READ', 'UPGRADE_WRITE']),
  },
  {
    name: 'Network Config',
    icon: <BuildIcon />,
    viewName: 'network_config',
    hideCondition: () => !isAuthorized(['CONFIG_READ', 'CONFIG_WRITE']),
  },
  {
    name: 'NMS Config',
    icon: <SettingsIcon />,
    viewName: 'config',
    noNetworkName: false,
    hideCondition: () => !isAuthorized(['NMS_CONFIG_READ', 'NMS_CONFIG_WRITE']),
  },
  {
    name: 'Sysdumps',
    icon: <GetAppIcon />,
    viewName: 'sysdumps',
    hideCondition: () => !isFeatureEnabled('GET_SYSDUMP_ENABLED'),
  },
];

const DRAWER_WIDTH = 240;

const useStyles = makeStyles(theme => ({
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: DRAWER_WIDTH,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9),
    },
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 0px',
    ...theme.mixins.toolbar,
  },
  drawerListItem: {
    '@media (min-width: 600px)': {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    },
  },
  active: {
    backgroundColor: theme.palette.grey[300],
  },
}));

export default function ViewDrawer({drawerOpen}: {drawerOpen: boolean}) {
  // Render the view selection drawer
  const classes = useStyles();
  const {getNetworkName} = useNetworkListContext();
  const networkName = getNetworkName();

  return (
    <Drawer
      variant="permanent"
      classes={{
        paper: classNames(
          classes.drawerPaper,
          !drawerOpen && classes.drawerPaperClose,
        ),
      }}
      open={drawerOpen}>
      <div className={classes.toolbar} />
      <List>
        {VIEWS.filter(
          viewOpts => !(viewOpts.hideCondition && viewOpts.hideCondition()),
        ).map(viewOpts => {
          const networklessView =
            viewOpts.noNetworkName && !viewOpts.noNetworkName;
          const toAddr =
            networkName === null
              ? `/${viewOpts.viewName}/`
              : `/${viewOpts.viewName}/${networkName ?? ''}/`;
          return (
            <Tooltip
              key={viewOpts.name}
              title={viewOpts.name}
              placement="right"
              disableHoverListener={drawerOpen}
              disableFocusListener={true}
              disableTouchListener={true}>
              <ListItem
                classes={{root: classes.drawerListItem}}
                to={toAddr}
                component={MUINavLink}
                activeClassName={classes.active}
                disabled={networkName === null && !networklessView}
                button>
                <ListItemIcon>{viewOpts.icon}</ListItemIcon>
                <ListItemText primary={viewOpts.name} />
              </ListItem>
            </Tooltip>
          );
        })}
        <Divider />
        <InfoMenu drawerOpen={drawerOpen} />
      </List>
    </Drawer>
  );
}
