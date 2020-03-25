/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import IconButton from '@material-ui/core/IconButton';
import {makeStyles} from '@material-ui/styles';

export type Props = {
  drawerWidth: number,
  drawerOpen: boolean,
  onDrawerToggle: () => any,
};

const useStyles = makeStyles(theme => ({
  root: {
    position: 'fixed',
    top: '50%',
    height: theme.spacing(4),
    width: theme.spacing(4),
    padding: 0,
    borderRadius: '50% 0% 0% 50%',
    border: '0px',
    backgroundColor: '#FFF',
    '&:hover': {
      backgroundColor: '#FFF',
    },
  },
}));

export default function DrawerToggleButton(props: Props) {
  const classes = useStyles();
  const {drawerOpen, drawerWidth, onDrawerToggle} = props;
  const toggleStyle = {right: drawerWidth - (drawerOpen ? 8 : 4)};

  return (
    <IconButton
      className={classes.root}
      style={toggleStyle}
      onClick={onDrawerToggle}
      size="small"
      data-testid="drawer-toggle-button">
      {drawerOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
    </IconButton>
  );
}
