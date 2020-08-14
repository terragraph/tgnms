/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import InsetPaper from '../../components/common/InsetPaper';
import MaterialModal from '../../components/common/MaterialModal';
import React from 'react';
import RestoreIcon from '@material-ui/icons/Restore';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  button: {
    margin: theme.spacing(),
  },
  chip: {
    margin: 2,
  },
  insetPaper: {
    margin: '4px 0',
    maxHeight: '200px',
    overflowY: 'auto',
    padding: 4,
  },
  rightIcon: {
    marginLeft: theme.spacing(),
  },
});

type Props = {
  classes: Object,
  selected: Array<string>,
  onDelete: (Array<string>) => void,
};

type State = {
  isOpen: boolean,
};

class ModalDelete extends React.Component<Props, State> {
  state = {
    isOpen: false,
  };

  handleOpen = () => {
    // Open the modal
    this.setState({isOpen: true});
  };

  handleClose = () => {
    // Close the modal
    this.setState({isOpen: false});
  };

  handleDelete = () => {
    this.props.onDelete(this.props.selected);
    this.handleClose();
  };

  render() {
    const {classes} = this.props;

    return (
      <div className={classes.root}>
        <Button
          className={classes.button}
          onClick={this.handleOpen}
          variant="outlined">
          Delete
          <RestoreIcon className={classes.rightIcon} />
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          modalTitle="Delete Sysdumps"
          modalContentText="The following sysdump(s) will be deleted. Would you like to continue?"
          modalContent={
            <InsetPaper className={classes.insetPaper} depression={1} rounded>
              {this.props.selected.map(nodeName => (
                <Chip
                  className={classes.chip}
                  key={nodeName}
                  label={nodeName}
                />
              ))}
            </InsetPaper>
          }
          modalActions={
            <>
              <Button
                className={classes.button}
                onClick={this.handleDelete}
                variant="outlined">
                Submit
              </Button>
              <Button
                className={classes.button}
                onClick={this.handleClose}
                variant="outlined">
                Cancel
              </Button>
            </>
          }
        />
      </div>
    );
  }
}

export default withStyles(styles)(ModalDelete);
