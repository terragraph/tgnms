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
import swal from 'sweetalert2';
import {
  UpgradeGroupType,
  UpgradeReqType,
} from '../../../thrift/gen-nodejs/Controller_types';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
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
  networkName: string,
};

type State = {
  isOpen: boolean,
};

class ModalReset extends React.Component<Props, State> {
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

  handleSubmitReset = () => {
    const requestId = 'NMS' + new Date().getTime();
    const data = {
      nodes: this.props.selected,
      ugType: UpgradeGroupType.NODES,
      urReq: {
        upgradeReqId: requestId,
        urType: UpgradeReqType.RESET_STATUS,
      },
    };

    apiServiceRequest(this.props.networkName, 'sendUpgradeRequest', data)
      .then(_response => {
        swal({
          type: 'info',
          title: 'Reset Status Submitted',
          text: `You have initiated the "Reset Status" process with requestId: ${requestId}. The status of your request can be found in the "Node Upgrade Status" table.`,
        });
      })
      .catch(error => {
        const errorText = getErrorTextFromE2EAck(error);
        swal({
          type: 'error',
          title: 'Reset Status Failed',
          text: `Your upgrade command failed with the following message:\n\n${errorText}.`,
        });
      });

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
          Reset
          <RestoreIcon className={classes.rightIcon} />
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          modalTitle="Reset Upgrade Status"
          modalContentText="The following node(s) will reset their upgrade status. Would you like to continue?"
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
                onClick={this.handleSubmitReset}
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

export default withStyles(styles)(ModalReset);
