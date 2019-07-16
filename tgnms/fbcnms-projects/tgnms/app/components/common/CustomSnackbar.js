/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import AutorenewIcon from '@material-ui/icons/Autorenew';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloseIcon from '@material-ui/icons/Close';
import ErrorIcon from '@material-ui/icons/Error';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/Info';
import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import WarningIcon from '@material-ui/icons/Warning';
import amber from '@material-ui/core/colors/amber';
import classNames from 'classnames';
import green from '@material-ui/core/colors/green';
import {withStyles} from '@material-ui/core/styles';
import type {Origin} from '@material-ui/core/Snackbar/Snackbar';

/* Copied from: https://material-ui.com/demos/snackbars/#customized-snackbars */

const styles = theme => ({
  success: {
    backgroundColor: green[600],
  },
  error: {
    backgroundColor: theme.palette.error.dark,
  },
  info: {
    backgroundColor: theme.palette.primary.dark,
  },
  warning: {
    backgroundColor: amber[700],
  },
  icon: {
    fontSize: 20,
  },
  iconVariant: {
    opacity: 0.9,
    marginRight: theme.spacing.unit * 2,
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: 568 /* from SnackbarContent */ - 68 /* action */,
  },
});

export const Variant = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const variantIcon = {
  [Variant.success]: CheckCircleIcon,
  [Variant.warning]: WarningIcon,
  [Variant.error]: ErrorIcon,
  [Variant.info]: InfoIcon,
};

type VariantKey = $Keys<typeof variantIcon>;

type Props = {
  classes: {[string]: string},
  className?: string,
  open?: boolean,
  message?: string,
  onClose: () => any,
  onRetry?: () => any,
  variant: VariantKey,
  anchorOrigin: Origin,
};

class CustomSnackbar extends React.Component<Props> {
  static defaultProps = {
    anchorOrigin: {vertical: 'bottom', horizontal: 'right'},
    variant: 'info',
  };
  handleClose = (event, reason) => {
    if (reason !== 'clickaway') {
      this.props.onClose();
    }
  };

  render() {
    const {
      classes,
      className,
      message,
      open,
      anchorOrigin,
      variant,
    } = this.props;
    const Icon = variantIcon[variant];

    return (
      <Snackbar
        anchorOrigin={anchorOrigin}
        open={!!open}
        autoHideDuration={6000}
        onClose={this.handleClose}>
        <SnackbarContent
          className={classNames(classes[variant], className)}
          message={
            <span className={classes.message}>
              <Icon className={classNames(classes.icon, classes.iconVariant)} />
              {message}
            </span>
          }
          action={[
            typeof this.props.onRetry === 'function' ? (
              <IconButton
                key="retry"
                aria-label="Retry"
                color="inherit"
                onClick={this.props.onRetry}>
                <AutorenewIcon className={classes.icon} />
              </IconButton>
            ) : null,
            <IconButton
              key="close"
              aria-label="Close"
              color="inherit"
              className={classes.close}
              onClick={this.handleClose}>
              <CloseIcon className={classes.icon} />
            </IconButton>,
          ]}
        />
      </Snackbar>
    );
  }
}

export type UINotification = {
  open?: boolean,
  message?: string,
  onRetry?: () => void | any,
  variant?: VariantKey,
};

export default withStyles(styles, {withTheme: true})(CustomSnackbar);
