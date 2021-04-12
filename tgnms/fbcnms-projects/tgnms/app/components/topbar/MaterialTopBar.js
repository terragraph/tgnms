/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import AlarmIcon from '@material-ui/icons/Alarm';
import AppBar from '@material-ui/core/AppBar';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import BuildIcon from '@material-ui/icons/Build';
import Button from '@material-ui/core/Button';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import DashboardIcon from '@material-ui/icons/Dashboard';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import GetAppIcon from '@material-ui/icons/GetApp';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/Info';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import MapIcon from '@material-ui/icons/Map';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import Menu from '@material-ui/core/Menu';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import MenuIcon from '@material-ui/icons/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NotificationMenu from './NotificationMenu/NotificationMenu';
import React from 'react';
import SettingsIcon from '@material-ui/icons/Settings';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import TableChartIcon from '@material-ui/icons/TableChart';
import TimelineIcon from '@material-ui/icons/Timeline';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import UserMenu from './UserMenu';
import axios from 'axios';
import classNames from 'classnames';
import {NavLink} from 'react-router-dom';
import {getUIConfig} from '../../common/uiConfig';
import {isAuthorized} from '@fbcnms/tg-nms/app/helpers/UserHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';
import type {ContextRouter} from 'react-router-dom';

const DRAWER_WIDTH = 240;
const ISSUES_URL = window?.CONFIG?.env?.ISSUES_URL;

type IndexProps = ContextRouter &
  WithStyles<typeof styles> & {
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
    backgroundColor: theme.palette.text.primary,
  },
  button: {
    marginRight: '5px',
  },
  drawerListItem: {
    '@media (min-width: 600px)': {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
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
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(9),
    },
  },
  grow: {
    flexGrow: 1,
  },
  link: {
    textDecoration: 'none',
  },
  networkMenuButton: {
    marginRight: theme.spacing(),
  },
  nested: {
    paddingLeft: theme.spacing(5),
  },
  root: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'auto',
    position: 'relative',
    zIndex: 1,
    height: '100%',
    padding: '10px',
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 0px',
    ...theme.mixins.toolbar,
  },
  toolbarButtonContainer: {
    marginLeft: theme.spacing(2),
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

export function VersionModal({title, diffs}) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <CustomAccordion
      title={title}
      details={diffs}
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
    />
  );
}

const DiffModal = props => (
  <Grid container spacing={1}>
    <Grid item xs={4}>
      Date
    </Grid>
    <Grid item xs={8}>
      Title
    </Grid>
    {props.diffs &&
      props.diffs.map((diffData, idx) => (
        <React.Fragment key={'diff' + idx}>
          <Grid item xs={4}>
            {diffData.date}
          </Grid>
          <Grid item xs={8}>
            {diffData.title}
          </Grid>
        </React.Fragment>
      ))}
  </Grid>
);

const ChangelogModal = () => {
  const [changelog, setChangelog] = React.useState([]);
  React.useEffect(() => {
    axios.get('/api/v1/changelog').then(response => {
      setChangelog(response.data);
    });
  }, []);
  return (
    <>
      {changelog.map(versionData => {
        const versionStr = versionData.version;
        return (
          <VersionModal
            key={'version-' + versionStr}
            title={'Version ' + versionStr}
            diffs={<DiffModal diffs={versionData.diffs} />}
          />
        );
      })}
    </>
  );
};

const BuildInformationModal = props => (
  <MaterialModal
    open={props.buildInformationOpen}
    onClose={props.toggleBuildModal}
    modalTitle="About"
    data-testid="about-modal"
    modalContent={
      <Grid container spacing={1}>
        <Grid item xs={4}>
          Version
        </Grid>
        <Grid item xs={8}>
          {props.version}-{props.commitHash}
        </Grid>
        <Grid item xs={4}>
          Date
        </Grid>
        <Grid item xs={8}>
          {props.commitDate}
        </Grid>
        <Grid item xs={12}>
          <ChangelogModal />
        </Grid>
      </Grid>
    }
    modalActions={
      <>
        {ISSUES_URL ? (
          <Button
            className={props.classes.button}
            href={ISSUES_URL}
            target="_blank"
            onClick={props.toggleBuildModal}
            variant="outlined">
            Submit Bug
          </Button>
        ) : null}
        <Button
          className={props.classes.button}
          onClick={props.toggleBuildModal}
          variant="outlined">
          Close
        </Button>
      </>
    }
  />
);

class MaterialTopBar extends React.Component<IndexProps, State> {
  constructor(props) {
    super(props);

    this.state = {
      drawerOpen: false,
      accountMenuAnchor: null,
      networksMenuAnchor: null,
      buildInformationOpen: false,
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
    const {version, env} = getUIConfig();
    // TODO - remove, build force
    const {COMMIT_DATE, COMMIT_HASH, DOC_URL} = env;
    const toggleBuildModal = () => {
      this.setState({buildInformationOpen: !this.state.buildInformationOpen});
    };

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
                  component={this.renderNavLink}
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
          {DOC_URL && (
            <Tooltip
              title="Help"
              placement="right"
              disableHoverListener={drawerOpen}
              disableFocusListener={true}
              disableTouchListener={false}>
              <ListItem
                component="a"
                href={DOC_URL}
                target="_blank"
                classes={{root: classes.drawerListItem}}
                button>
                <ListItemIcon>
                  <MenuBookIcon />
                </ListItemIcon>
                <ListItemText primary="Help" />
              </ListItem>
            </Tooltip>
          )}
          {COMMIT_DATE && COMMIT_HASH && (
            <>
              <Tooltip
                title="About"
                placement="right"
                disableHoverListener={drawerOpen}
                disableFocusListener={true}
                disableTouchListener={false}>
                <ListItem
                  classes={{root: classes.drawerListItem}}
                  data-testid="toggle-about-modal"
                  onClick={toggleBuildModal}
                  button>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText primary="About" />
                </ListItem>
              </Tooltip>
              <BuildInformationModal
                classes={classes}
                buildInformationOpen={this.state.buildInformationOpen}
                toggleBuildModal={toggleBuildModal}
                version={version}
                commitDate={COMMIT_DATE}
                commitHash={COMMIT_HASH}
              />
            </>
          )}
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
          data-testid="toggle-networks-menu"
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
                component={this.renderNavLink}
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

            <div className={classes.grow} />

            {isFeatureEnabled('LOGIN_ENABLED') && <UserMenu />}
            {isFeatureEnabled('NOTIFICATION_MENU_ENABLED') && (
              <NotificationMenu />
            )}
            {this.renderNetworkMenu(networkName, listContext)}
          </Toolbar>
        </AppBar>

        {this.renderViewDrawer(networkName)}
      </>
    );
  };

  renderNavLink = React.forwardRef((props, ref) => {
    return <NavLink {...props} innerRef={ref} />;
  });
}

MaterialTopBar.propTypes = {};

export default withStyles(styles, {withTheme: true})(
  withRouter(MaterialTopBar),
);
