/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import typeof SvgIcon from '@material-ui/core/@@SvgIcon';

import * as React from 'react';
import ArrowRight from '@material-ui/icons/ArrowRight';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  menuItem: {
    paddingLeft: theme.spacing(2),
  },
}));

export default function ActionsMenuNested({
  label,
  icon,
  hasHeading,
  children,
}: {
  label: string,
  icon?: React.Element<SvgIcon>,
  hasHeading?: boolean,
  children: any,
}) {
  const menuRef = React.useRef<?HTMLElement>(null);
  const classes = useStyles();
  const [subMenuOpen, setSubMenuOpen] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setSubMenuOpen(true)}
      onMouseLeave={() => setSubMenuOpen(false)}>
      <MenuItem ref={(menuRef: any)}>
        <div className={hasHeading ? classes.menuItem : null}>
          {icon && <ListItemIcon>{icon}</ListItemIcon>}
          <ListItemText primary={label} />
        </div>
        <ArrowRight />
      </MenuItem>
      <Menu
        style={{pointerEvents: 'none'}}
        anchorEl={menuRef.current}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        open={subMenuOpen}>
        <div style={{pointerEvents: 'auto'}}>{children}</div>
      </Menu>
    </div>
  );
}
