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
  isOpen: boolean,
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
    borderRight: 'none',
    boxShadow:
      '-5px 3px 5px -9px rgb(0 0 0 / 20%), -5px 6px 10px -5px rgb(0 0 0 / 14%), -5px 1px 18px -10px rgb(0 0 0 / 12%)',
  },
}));

export default function DrawerToggleButton(props: Props) {
  const classes = useStyles();
  const {isOpen, drawerWidth, onDrawerToggle} = props;
  const toggleStyle = {right: drawerWidth - (isOpen ? 8 : 4)};

  return (
    <IconButton
      className={classes.root}
      style={toggleStyle}
      onClick={onDrawerToggle}
      size="small"
      data-testid="drawer-toggle-button">
      {isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
    </IconButton>
  );
}
