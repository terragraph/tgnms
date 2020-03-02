/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import {withStyles} from '@material-ui/core/styles';

const styles = () => ({
  actionsButton: {
    textAlign: 'center',
  },
});

type ActionOptions = {
  actionItems: Array<{
    heading: string,
    actions: Array<ActionType>,
  }>,
  buttonClassName?: string,
  buttonName?: string,
};

type ActionType = {
  label: string,
  icon?: React.Element<React.ComponentType<SvgIconExports>>,
  func?: () => any,
  component?: React.ComponentType<any>,
};

type Props = {
  classes: {[string]: string},
  options: ActionOptions,
};

type State = {
  anchor: ?HTMLElement,
};

class ActionsMenu extends React.Component<Props, State> {
  state = {
    anchor: null,
  };

  render() {
    const {options, classes} = this.props;
    const {anchor} = this.state;
    const {actionItems, buttonClassName} = options;

    return (
      <>
        <List component="nav">
          <ListItem
            className={buttonClassName ? classes[buttonClassName] : ''}
            button
            dense
            aria-haspopup={true}
            onClick={ev => this.setState({anchor: ev.currentTarget})}>
            <ListItemText
              primary={options.buttonName || 'View Actions\u2026'}
              primaryTypographyProps={{variant: 'button'}}
            />
          </ListItem>
        </List>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => this.setState({anchor: null})}
          disableAutoFocusItem>
          {actionItems.map(({heading, actions}) => [
            <ListSubheader
              key={heading}
              component="div"
              style={{lineHeight: '2rem', outline: 'none'}}>
              {heading}
            </ListSubheader>,
            ...actions.map(({label, icon, func, component}) => {
              return (
                <MenuItem
                  key={label}
                  onClick={() => {
                    this.setState({anchor: null});
                    if (func) {
                      func();
                    }
                  }}
                  {...(component ? {component} : {})}>
                  {icon && <ListItemIcon>{icon}</ListItemIcon>}
                  <ListItemText primary={label} />
                </MenuItem>
              );
            }),
          ])}
        </Menu>
      </>
    );
  }
}

export default withStyles(styles)(ActionsMenu);
