/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AppBar from '@material-ui/core/AppBar';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import NetworkMenu from './NetworkMenu';
import NotificationMenu from './NotificationMenu/NotificationMenu';
import React from 'react';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import UserMenu from './UserMenu';
import ViewDrawer from './ViewDrawer';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles, useTheme} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    backgroundColor: '#F5F7FC',
  },
  drawerMenuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  grow: {
    flexGrow: 1,
  },
  text: {
    color: theme.palette.text.primary,
  },
}));

export default function MaterialTopBar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const {transitions} = useTheme();

  const onDrawerToggle = React.useCallback(() => {
    // Set state and also trigger a callback after state has been updated. This
    // callback quickly triggers window resize events to force the map to resize
    // itself.
    setDrawerOpen(!drawerOpen);

    // Figure out duration of animation
    let duration = transitions.duration.enteringScreen;
    if (drawerOpen) {
      duration = transitions.duration.leavingScreen;
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
  }, [drawerOpen, transitions]);

  const classes = useStyles();

  return (
    <>
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar disableGutters={true}>
          <IconButton
            aria-label="Open drawer"
            onClick={onDrawerToggle}
            className={`${classes.drawerMenuButton} ${classes.text}`}>
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" className={classes.text} noWrap>
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
}
