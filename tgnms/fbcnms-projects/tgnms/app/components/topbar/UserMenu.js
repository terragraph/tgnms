/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import IconButton from '@material-ui/core/IconButton';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import PersonIcon from '@material-ui/icons/Person';
import {getUser} from '../../common/uiConfig';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  menuIcon: {
    padding: theme.spacing(2),
  },
  menu: {
    width: 200,
  },
  userFullNameWrapper: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  userFullName: {
    textTransform: 'capitalize',
    display: 'inline-block',
    textAlign: 'center',
    width: '100%',
    fontSize: '1.2rem',
    color: theme.palette.text.secondary,
  },
  logoutBtn: {
    width: '100%',
  },
}));

export default function UserMenu() {
  const iconButtonRef = React.useRef<any>(null);
  const formRef = React.useRef<?HTMLFormElement>(null);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const classes = useStyles();
  return (
    <>
      <IconButton
        aria-owns={isMenuOpen ? 'user-menu' : undefined}
        aria-haspopup="true"
        color="inherit"
        className={classes.menuIcon}
        data-testid="menu-toggle"
        title="User Menu Toggle"
        ref={iconButtonRef}
        onClick={() => setMenuOpen(true)}>
        <PersonIcon />
      </IconButton>
      <Menu
        classes={{paper: classes.menu}}
        onClose={() => setMenuOpen(false)}
        open={isMenuOpen}
        id="user-menu"
        anchorEl={iconButtonRef.current}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        data-testid="user-menu">
        <ListItem className={classes.userFullNameWrapper} divider>
          <ListItemText
            primary={getUser()?.name || 'Unknown Name'}
            primaryTypographyProps={{className: classes.userFullName}}
          />
        </ListItem>
        <form
          ref={formRef}
          id="logout-form"
          method="POST"
          action="/user/logout">
          <MenuItem
            component="button"
            role="button"
            type="submit"
            data-testid="logout-menuitem"
            classes={{root: classes.logoutBtn}}>
            <ListItemIcon>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary="Log Out" />
          </MenuItem>
        </form>
      </Menu>
    </>
  );
}
