/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import typeof SvgIcon from '@material-ui/core/@@SvgIcon';

import * as React from 'react';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  actionsButton: {
    textAlign: 'center',
  },
  actionCategoryDivider: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
});

type ActionOptions = {
  actionItems: Array<{
    heading: string,
    actions: Array<ActionType>,
    isDisabled?: boolean,
  }>,
  buttonClassName?: string,
  buttonName?: string,
};

type ActionType = {|
  label: string,
  icon?: React.Element<SvgIcon>,
  func?: () => *,
  component?: React.ComponentType<*>,
  isDisabled?: boolean,
  'data-testid'?: string,
|};

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
              primary={options.buttonName || 'View Actions'}
              primaryTypographyProps={{variant: 'button'}}
            />
          </ListItem>
        </List>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => this.setState({anchor: null})}
          disableAutoFocusItem>
          {actionItems.map(({heading, actions, isDisabled}, idx) =>
            isDisabled === true
              ? null
              : [
                  <ListSubheader
                    key={heading}
                    component="div"
                    style={{lineHeight: '2rem', outline: 'none'}}>
                    {heading}
                  </ListSubheader>,
                  ...actions.map(
                    ({
                      label,
                      icon,
                      func,
                      component,
                      isDisabled,
                      ...itemProps
                    }) => {
                      if (isDisabled === true) {
                        return null;
                      }
                      const testId = itemProps['data-testid'];
                      return (
                        <MenuItem
                          data-testid={testId ?? null}
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
                    },
                  ),
                  idx < actionItems.length - 1 ? (
                    <Divider className={classes.actionCategoryDivider} />
                  ) : null,
                ],
          )}
        </Menu>
      </>
    );
  }
}

export default withStyles(styles)(ActionsMenu);
