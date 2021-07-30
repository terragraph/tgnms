/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Divider from '@material-ui/core/Divider';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import MenuItem from '@material-ui/core/MenuItem';
import {makeStyles} from '@material-ui/styles';

import ActionsMenuNested from './ActionsMenuNested';
import {styles} from './ActionsConstants';
import type {ActionGroup, ActionItem} from './ActionsConstants';

const useStyles = makeStyles(styles);

export default function ActionsMenuItems({
  actionItems,
  onCleanUp,
}: {
  actionItems: ActionGroup[],
  onCleanUp?: () => *,
}) {
  const classes = useStyles();

  function createMenu(items: ActionGroup[]) {
    return (items: any).map(({actions, heading, isDisabled}, idx) =>
      isDisabled === true
        ? null
        : [
            heading ? (
              <ListSubheader
                key={heading}
                component="div"
                style={{lineHeight: '2rem', outline: 'none'}}>
                {heading}
              </ListSubheader>
            ) : null,

            ...actions.map(e => createMenuItem(e, !!heading)),

            idx < items.length - 1 ? (
              <Divider className={classes.actionCategoryDivider} />
            ) : null,
          ],
    );
  }

  function createMenuItem(
    {
      label,
      icon,
      func,
      component,
      isDisabled,
      subMenu,
      ...itemProps
    }: ActionItem,
    hasHeading: boolean,
  ) {
    if (isDisabled === true) {
      return null;
    }
    const testId = itemProps['data-testid'];
    const className = itemProps.className;
    if (subMenu) {
      return (
        <ActionsMenuNested
          key={label}
          label={label}
          icon={icon}
          hasHeading={hasHeading}>
          {createMenu(subMenu)}
        </ActionsMenuNested>
      );
    } else {
      return (
        <MenuItem
          data-testid={testId ?? null}
          className={className ?? ''}
          key={label}
          onClick={() => {
            if (onCleanUp) {
              onCleanUp();
            }
            if (func) {
              func();
            }
          }}
          {...(component ? {component} : {})}>
          <div className={hasHeading ? classes.menuItem : null}>
            {icon && <ListItemIcon>{icon}</ListItemIcon>}
            <ListItemText primary={label} />
          </div>
        </MenuItem>
      );
    }
  }
  return createMenu(actionItems);
}
