/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import classNames from 'classnames';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';
import React from 'react';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  paper: {
    minWidth: theme.breakpoints.values.sm,
  },
  dialogTitle: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  dialogContent: {
    padding: theme.spacing.unit * 2,
  },
  dialogActions: {
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing.unit,
    margin: 0,
  },
});

class MaterialModal extends React.Component {
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
    } = this.props;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        onEnter={onEnter}
        PaperProps={{classes: {root: classNames(classes.paper, className)}}}>
        <DialogTitle classes={{root: classes.dialogTitle}}>
          {modalTitle}
        </DialogTitle>
        <DialogContent classes={{root: classes.dialogContent}}>
          {modalContentText ? (
            <DialogContentText>{modalContentText}</DialogContentText>
          ) : null}
          {modalContent}
        </DialogContent>
        <DialogActions classes={{root: classes.dialogActions}}>
          {modalActions}
        </DialogActions>
      </Dialog>
    );
  }
}

MaterialModal.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  theme: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onEnter: PropTypes.func,
  modalTitle: PropTypes.node,
  modalContent: PropTypes.node,
  modalContentText: PropTypes.node,
  modalActions: PropTypes.node,
};

export default withStyles(styles, {withTheme: true})(MaterialModal);
