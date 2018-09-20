/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Display docker host list.
 */
'use strict';

import classNames from 'classnames';
import DockerContainers from './DockerContainers.js';
import DockerImages from './DockerImages.js';
import {getDockerHosts} from '../../apiutils/DockerUtils.js';
import PropTypes from 'prop-types';
import React from 'react';

import AppBar from '@material-ui/core/AppBar';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Collapse from '@material-ui/core/Collapse';
import ComputerIcon from '@material-ui/icons/Computer';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuIcon from '@material-ui/icons/Menu';
import RouterIcon from '@material-ui/icons/Router';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import WifiIcon from '@material-ui/icons/Wifi';
import {withStyles} from '@material-ui/core/styles';

const drawerWidth = 240;

const styles = theme => ({
  appBar: {
    marginTop: '3px', /* padding for main/top app bar which is buggy */
    transition: theme.transitions.create(['width', 'margin'], {
      duration: theme.transitions.duration.leavingScreen,
      easing: theme.transitions.easing.sharp,
    }),
    zIndex: theme.zIndex.drawer + 1,
  },
  appBarShift: {
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['width', 'margin'], {
      duration: theme.transitions.duration.enteringScreen,
      easing: theme.transitions.easing.sharp,
    }),
    width: `calc(100% - ${drawerWidth}px)`,
  },
  content: {
    backgroundColor: theme.palette.background.default,
    flexGrow: 1,
    overflow: 'scroll',
    padding: theme.spacing.unit * 3,
  },
  drawerPaper: {
    position: 'relative',
    transition: theme.transitions.create('width', {
      duration: theme.transitions.duration.enteringScreen,
      easing: theme.transitions.easing.sharp,
    }),
    whiteSpace: 'nowrap',
    width: drawerWidth,
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      duration: theme.transitions.duration.leavingScreen,
      easing: theme.transitions.easing.sharp,
    }),
    width: theme.spacing.unit * 7,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9,
    },
  },
  hide: {
    display: 'none',
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
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
  },
  subheading: {
    fontSize: '14px',
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
});

class DockerHosts extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      activePanel: '',
      dockerHosts: [],
      drawerOpen: false,
      selectedHostId: 0,
    };
  }

  componentDidMount() {
    getDockerHosts().then(dockerHosts => this.setState({dockerHosts}));
  }

  render() {
    const {classes, theme} = this.props;
    const {activePanel, dockerHosts, drawerOpen, selectedHostId} = this.state;
    const mainPane = [];
    switch (activePanel) {
      case 'hosts':
        mainPane.push(
          <DockerImages instanceId={selectedHostId} key="images-pane" />,
        );
        mainPane.push(
          <DockerContainers
            instanceId={selectedHostId}
            key="containers-pane"
          />,
        );
        break;
      default:
        break;
    }
    return (
      <div className={classes.root}>
        <AppBar
          position="absolute"
          className={classNames(
            classes.appBar,
            drawerOpen && classes.appBarShift,
          )}>
          <Toolbar disableGutters={!drawerOpen}>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={clk =>
                this.setState({drawerOpen: !drawerOpen})
              }
              className={classNames(
                classes.menuButton,
                drawerOpen && classes.hide,
              )}>
              <MenuIcon />
            </IconButton>
            <Typography variant="title" color="inherit" noWrap>
              Manage Services
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: classNames(
              classes.drawerPaper,
              !drawerOpen && classes.drawerPaperClose,
            ),
          }}
          open={drawerOpen}>
          <div className={classes.toolbar}>
            <IconButton
              onClick={clk =>
                this.setState({drawerOpen: !drawerOpen})
              }>
              {theme.direction === 'rtl' ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </div>
          <Divider />
          <List>
            <ListItem
              button
              onClick={evt =>
                this.setState({
                  drawerOpen: !drawerOpen,
                })
              }>
              <ListItemIcon>
                <RouterIcon />
              </ListItemIcon>
              <ListItemText primary="Hosts" />
              {drawerOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={drawerOpen} timeout="auto" unmountOnExit>
              <List disablePadding className={classes.nested}>
                {dockerHosts.map(hostDetails => (
                  <ListItem
                    key={hostDetails.id}
                    button
                    selected={this.state.selectedHostId === hostDetails.id}
                    onClick={evt =>
                      this.setState({
                        activePanel: 'hosts',
                        selectedHostId: hostDetails.id,
                      })
                    }>
                    <ListItemIcon>
                      <WifiIcon />
                    </ListItemIcon>
                    <ListItemText inset primary={hostDetails.name} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
            <ListItem button>
              <ListItemIcon>
                <ComputerIcon />
              </ListItemIcon>
              <ListItemText primary="Networks" />
            </ListItem>
            <ListItem button>
              <ListItemIcon>
                <LibraryBooksIcon />
              </ListItemIcon>
              <ListItemText primary="Registry" />
            </ListItem>
          </List>
          <Divider />
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          {mainPane}
        </main>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(DockerHosts);
