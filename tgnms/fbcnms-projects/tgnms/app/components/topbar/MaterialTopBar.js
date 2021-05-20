/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import AppBar from '@material-ui/core/AppBar';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import NetworkListContext from '@fbcnms/tg-nms/app/contexts/NetworkListContext';
import NetworkMenu from './NetworkMenu';
import NotificationMenu from './NotificationMenu/NotificationMenu';
import React from 'react';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import UserMenu from './UserMenu';
import ViewDrawer from './ViewDrawer';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {ContextRouter} from 'react-router-dom';

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

  drawerMenuButton: {
    marginLeft: 12,
    marginRight: 36,
  },

  grow: {
    flexGrow: 1,
  },
  link: {
    textDecoration: 'none',
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
  toolbarButtonContainer: {
    marginLeft: theme.spacing(2),
  },
  v1Button: {
    opacity: 0.8,
  },
});

class MaterialTopBar extends React.Component<IndexProps, State> {
  constructor(props) {
    super(props);

    this.state = {
      drawerOpen: false,
      accountMenuAnchor: null,
    };
  }

  openAccountMenu = e => this.setState({accountMenuAnchor: e.currentTarget});
  closeAccountMenu = () => this.setState({accountMenuAnchor: null});

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

  renderContext = () => {
    const {classes} = this.props;
    const {drawerOpen} = this.state;

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
            <NetworkMenu />
          </Toolbar>
        </AppBar>
        <ViewDrawer drawerOpen={drawerOpen} />
      </>
    );
  };
}

MaterialTopBar.propTypes = {};

export default withStyles(styles, {withTheme: true})(
  withRouter(MaterialTopBar),
);
