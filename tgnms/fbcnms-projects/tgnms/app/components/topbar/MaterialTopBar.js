/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import AppBar from '@material-ui/core/AppBar';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import BarChartIcon from '@material-ui/icons/BarChart';
import BugReportIcon from '@material-ui/icons/BugReport';
import BuildIcon from '@material-ui/icons/Build';
import Button from '@material-ui/core/Button';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import classNames from 'classnames';
import CodeIcon from '@material-ui/icons/Code';
import type {ContextRouter} from 'react-router-dom';
import DashboardIcon from '@material-ui/icons/Dashboard';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import {NETWORK_TEST_ENABLED} from '../../constants/FeatureFlags';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import MapIcon from '@material-ui/icons/Map';
import Menu from '@material-ui/core/Menu';
import MenuIcon from '@material-ui/icons/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import {NavLink} from 'react-router-dom';
import NetworkListContext from '../../NetworkListContext';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import NetworkCheckIcon from '@material-ui/icons/NetworkCheck';
import SettingsIcon from '@material-ui/icons/Settings';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import TableChartIcon from '@material-ui/icons/TableChart';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';
import {withRouter} from 'react-router-dom';

const DRAWER_WIDTH = 240;
const {ISSUES_URL, V1_URL} = window.CONFIG.env;

type IndexProps = ContextRouter &
  WithStyles & {
    networks: Array<string>,
    user: SessionUser,
  };
type State = {
  accountMenuAnchor: ?HTMLElement,
  networksMenuAnchor: ?HTMLElement,
};

const styles = theme => ({
  active: {
    backgroundColor: theme.palette.grey[300],
  },
  anchor: {
    textDecoration: 'none',
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  drawerListItem: {
    '@media (min-width: 600px)': {
      paddingLeft: theme.spacing.unit * 3,
      paddingRight: theme.spacing.unit * 3,
    },
  },
  drawerMenuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
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
    width: theme.spacing.unit * 7,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9,
    },
  },
  grow: {
    flexGrow: 1,
  },
  link: {
    textDecoration: 'none',
  },
  networkMenuButton: {
    marginRight: theme.spacing.unit,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 5,
  },
  root: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'auto',
    position: 'relative',
    zIndex: 1,
    height: '100%',
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 0px',
    ...theme.mixins.toolbar,
  },
  toolbarButtonContainer: {
    marginLeft: theme.spacing.unit * 2,
  },
  v1Button: {
    opacity: 0.8,
  },
});

// View names, icons, and routes
// NOTE: When adding/removing views, also update NetworkUI::renderRoutes()
const VIEWS = [
  {name: 'Map', icon: <MapIcon />, viewName: 'map'},
  {name: 'Tables', icon: <TableChartIcon />, viewName: 'tables'},
  {name: 'Stats', icon: <BarChartIcon />, viewName: 'stats'},
  {
    name: 'Dashboards',
    icon: <DashboardIcon />,
    viewName: 'dashboards',
    // hide dashboards if grafana URL is unknown
    hideCondition: () => !window.CONFIG.env.hasOwnProperty('GRAFANA_URL'),
  },
  {
    name: 'Logs',
    icon: <CodeIcon />,
    viewName: 'logs',
    hideCondition: () => !window.CONFIG.env.NODELOGS_ENABLED,
  },
  {name: 'Upgrade', icon: <CloudUploadIcon />, viewName: 'upgrade'},
  {
    name: 'Network Tests',
    icon: <NetworkCheckIcon />,
    viewName: 'network_test',
    hideCondition: () => !NETWORK_TEST_ENABLED,
  },
  {name: 'Node Config', icon: <RouterIcon />, viewName: 'node_config'},
  {name: 'E2E Config', icon: <BuildIcon />, viewName: 'e2e_config'},
  {
    name: 'NMS Config',
    icon: <SettingsIcon />,
    viewName: 'config',
    noNetworkName: false,
  },
];

class MaterialTopBar extends React.Component<IndexProps, State> {
  constructor(props) {
    super(props);

    this.state = {
      drawerOpen: false,
      accountMenuAnchor: null,
      networksMenuAnchor: null,
    };
  }

  openAccountMenu = e => this.setState({accountMenuAnchor: e.currentTarget});
  closeAccountMenu = () => this.setState({accountMenuAnchor: null});
  openNetworksMenu = e => this.setState({networksMenuAnchor: e.currentTarget});
  closeNetworksMenu = () => this.setState({networksMenuAnchor: null});

  renderViewDrawer = networkName => {
    // Render the view selection drawer
    const {classes} = this.props;
    const {drawerOpen} = this.state;

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
            viewOpts =>
              !(
                viewOpts.hasOwnProperty('hideCondition') &&
                viewOpts.hideCondition()
              ),
          ).map(viewOpts => {
            const networklessView =
              viewOpts.hasOwnProperty('noNetworkName') &&
              !viewOpts.noNetworkName;

            const toAddr =
              networkName === null
                ? `/${viewOpts.viewName}/`
                : `/${viewOpts.viewName}/${networkName}/`;
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
                  component={NavLink}
                  activeClassName={classes.active}
                  disabled={networkName === null && !networklessView}
                  button>
                  <ListItemIcon>{viewOpts.icon}</ListItemIcon>
                  <ListItemText primary={viewOpts.name} />
                </ListItem>
              </Tooltip>
            );
          })}

          {ISSUES_URL ? (
            <>
              <Divider />
              <Tooltip
                title="Report Bug"
                placement="right"
                disableHoverListener={drawerOpen}
                disableFocusListener={true}
                disableTouchListener={true}>
                <a className={classes.anchor} href={ISSUES_URL} target="_blank">
                  <ListItem classes={{root: classes.drawerListItem}} button>
                    <ListItemIcon>
                      <BugReportIcon />
                    </ListItemIcon>
                    <ListItemText primary="Report Bug" />
                  </ListItem>
                </a>
              </Tooltip>
            </>
          ) : null}
        </List>
      </Drawer>
    );
  };

  renderNetworkMenu = (networkName, listContext) => {
    // Render the network selection menu
    const {classes} = this.props;
    const {networksMenuAnchor} = this.state;
    const {networkList} = listContext;
    const activeNetwork =
      networkName && networkList && networkList.hasOwnProperty(networkName)
        ? networkList[networkName]
        : null;

    return (
      <div>
        <Button
          aria-owns={networksMenuAnchor ? 'networks-appbar' : null}
          aria-haspopup="true"
          className={classes.networkMenuButton}
          onClick={this.openNetworksMenu}
          color="inherit">
          {networkName !== null && activeNetwork ? (
            <StatusIndicator
              color={
                activeNetwork.controller_online
                  ? StatusIndicatorColor.GREEN
                  : StatusIndicatorColor.RED
              }
            />
          ) : null}
          {networkName !== null ? networkName : 'Not Selected'}
          <ArrowDropDownIcon />
        </Button>
        <Menu
          id="networks-appbar"
          anchorEl={networksMenuAnchor}
          anchorOrigin={{vertical: 'top', horizontal: 'right'}}
          transformOrigin={{vertical: 'top', horizontal: 'right'}}
          MenuListProps={{
            subheader: (
              <ListSubheader component="div">
                <strong>Network</strong>
              </ListSubheader>
            ),
          }}
          open={!!networksMenuAnchor}
          onClose={this.closeNetworksMenu}>
          {networkList !== null && Object.keys(networkList).length > 0 ? (
            Object.entries(networkList).map(([networkName, network]) => (
              <MenuItem
                key={networkName}
                component={NavLink}
                value={networkName}
                to={listContext.changeNetworkName(networkName)}
                activeClassName={classes.active}
                disabled={!network.controller_online}>
                <StatusIndicator
                  color={
                    network.controller_online
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
                {networkName}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No networks defined.</MenuItem>
          )}
        </Menu>
      </div>
    );
  };

  onDrawerToggle = () => {
    const {drawerOpen} = this.state;
    const {theme} = this.props;

    // Set state and also trigger a callback after state has been updated. This
    // callback quickly triggers window resize events to force the map to resize
    // itself.
    this.setState({drawerOpen: !drawerOpen}, () => {
      // Figure out duration of animation
      let duration = theme.transitions.duration.enteringScreen;
      if (drawerOpen) {
        duration = theme.transitions.duration.leavingScreen;
      }

      // Add a some buffer to the duration in case it misses an edge
      duration += 20;
      const startTime = new Date().getTime();
      const interval = setInterval(() => {
        // Clear the interval after the
        if (new Date().getTime() - startTime > duration) {
          clearInterval(interval);
          return;
        }
        window.dispatchEvent(new Event('resize'));
      }, 10 /* 100 fps, should be good enough :) */);
    });
  };

  render() {
    return (
      <NetworkListContext.Consumer>
        {this.renderContext}
      </NetworkListContext.Consumer>
    );
  }

  renderContext = listContext => {
    const {classes} = this.props;
    const {drawerOpen} = this.state;
    const networkName = listContext.getNetworkName();

    return (
      <>
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar disableGutters={true}>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={this.onDrawerToggle}
              className={classes.drawerMenuButton}>
              {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
            <Typography variant="h6" color="inherit" noWrap>
              Terragraph NMS
            </Typography>
            <div className={classes.toolbarButtonContainer}>
              {V1_URL ? (
                <Button
                  className={classes.v1Button}
                  color="inherit"
                  href={V1_URL}
                  target="_blank">
                  Go back to NMS V1
                </Button>
              ) : null}
            </div>

            <div className={classes.grow} />

            {this.renderNetworkMenu(networkName, listContext)}
          </Toolbar>
        </AppBar>

        {this.renderViewDrawer(networkName)}
      </>
    );
  };
}

MaterialTopBar.propTypes = {};

export default withStyles(styles, {withTheme: true})(
  withRouter(MaterialTopBar),
);
