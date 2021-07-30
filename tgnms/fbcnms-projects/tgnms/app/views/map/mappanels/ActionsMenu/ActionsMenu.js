/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import {makeStyles} from '@material-ui/styles';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

import ActionsMenuItems from './ActionsMenuItems';
import {styles} from './ActionsConstants';
import type {ActionOptions} from './ActionsConstants';

const useStyles = makeStyles(styles);

export default function ActionsMenu({options}: {options: ActionOptions}) {
  const [anchor, setAnchor] = React.useState(null);
  const classes = useStyles();
  const {actionItems, buttonClassName} = options;
  const {nextStep} = useTutorialContext();

  const handleViewActionsClick = React.useCallback(
    ev => {
      setAnchor(ev.currentTarget);
      nextStep();
    },
    [nextStep],
  );

  return (
    <>
      <List component="nav">
        <ListItem
          className={buttonClassName ? classes[buttonClassName] : ''}
          button
          dense
          aria-haspopup={true}
          onClick={handleViewActionsClick}>
          <ListItemText
            primary={options.buttonName || 'View Actions'}
            primaryTypographyProps={{variant: 'button'}}
          />
        </ListItem>
      </List>
      <Menu
        anchorEl={anchor}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        disableAutoFocusItem>
        <ActionsMenuItems
          actionItems={actionItems}
          onCleanUp={() => setAnchor(null)}
        />
      </Menu>
    </>
  );
}
