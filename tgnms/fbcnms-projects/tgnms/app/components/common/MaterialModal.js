/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import classNames from 'classnames';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  paper: {
    minWidth: theme.breakpoints.values.sm,
  },
  dialogTitle: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  dialogActions: {
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
    margin: 0,
  },
});

type Props = {
  classes: {[string]: string},
  className?: string,
  theme?: Object,
  open: ?boolean,
  onClose?: () => any,
  onEnter?: () => any,
  modalTitle?: React.Node,
  modalContent?: React.Node,
  modalContentText?: React.Node,
  modalActions?: React.Node,
};

class MaterialModal extends React.Component<Props> {
  render() {
    const {
      classes,
      className,
      modalTitle,
      modalContent,
      modalContentText,
      modalActions,
      open,
      onClose,
      onEnter,
      ...paperProps
    } = this.props;

    return (
      <Dialog
        open={open || false}
        onClose={onClose}
        onEnter={onEnter}
        PaperProps={{
          classes: {root: classNames(classes.paper, className)},
          ...(paperProps || {}: {classes?: string}),
        }}>
        <DialogTitle classes={{root: classes.dialogTitle}}>
          {modalTitle}
        </DialogTitle>
        <DialogContent classes={{root: classes.dialogContent}}>
          {modalContentText ? (
            <DialogContentText>{modalContentText}</DialogContentText>
          ) : null}
          {modalContent}
        </DialogContent>
        {modalActions !== null && (
          <DialogActions classes={{root: classes.dialogActions}}>
            {modalActions}
          </DialogActions>
        )}
      </Dialog>
    );
  }
}

export default withStyles(styles, {withTheme: true})(MaterialModal);
