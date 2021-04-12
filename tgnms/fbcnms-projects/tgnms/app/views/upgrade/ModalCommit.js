/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Collapse from '@material-ui/core/Collapse';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import InsetPaper from '@fbcnms/tg-nms/app/components/common/InsetPaper';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import React from 'react';
import Switch from '@material-ui/core/Switch';
import UpdateIcon from '@material-ui/icons/Update';
import swal from 'sweetalert2';
import {BatchingType} from '@fbcnms/tg-nms/app/constants/UpgradeConstants';
import {
  UpgradeGroupTypeValueMap as UpgradeGroupType,
  UpgradeReqTypeValueMap as UpgradeReqType,
} from '@fbcnms/tg-nms/shared/types/Controller';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  createCheckboxGroupInput,
  createNumericInput,
  createRadioGroupInput,
  formParseInt,
} from '@fbcnms/tg-nms/app/helpers/FormHelpers';
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

const initState = Object.freeze({
  batchingType: BatchingType.AUTO_UNLIMITED,
  batchSizeLimit: 1,
  commitDelay: 0,
  retryLimit: 3,
  skipFailure: false,
  skipPopFailure: false,
  timeout: 180,
});

type Props = {
  classes: Object,
  excluded: Array<string>,
  selected: Array<string>,
  networkName: string,
};

type State = {
  batchingType: string,
  batchSizeLimit: number,
  commitDelay: number,
  isOpen: boolean,
  retryLimit: number,
  showAdvanced: boolean,
  skipFailure: boolean,
  skipPopFailure: boolean,
  timeout: number,
};

class ModalCommit extends React.Component<Props, State> {
  state = {
    isOpen: false,
    showAdvanced: false,
    ...initState,
  };

  handleOpen = () => {
    // Open the modal
    this.setState({isOpen: true});
  };

  handleClose = () => {
    // Close the modal. Reset showAdvanced here instead of handleEnter to avoid
    // collapsing animation onEnter
    this.setState({isOpen: false, showAdvanced: false});
  };

  handleEnter = () => {
    // Reset the modal state on enter
    this.setState(initState);
  };

  handleShowAdvanced = () => {
    // Toggle showing the advanced options
    this.setState(prevState => ({showAdvanced: !prevState.showAdvanced}));
  };

  validateCommitInputs = () => {
    // Validate some inputs to the COMMIT request
    const {batchingType} = this.state;

    // Check batch size if running with a limit
    if (batchingType === BatchingType.AUTO_LIMITED) {
      const batchSizeLimit = formParseInt(this.state.batchSizeLimit);
      if (batchSizeLimit === null || batchSizeLimit < 1) {
        swal({
          type: 'error',
          title: 'Invalid Input',
          text: `Batch size limit is invalid. Please enter a positive number.`,
        });
        return false;
      }
    }

    return true;
  };

  handleSubmitCommit = () => {
    const {excluded, selected} = this.props;
    const {batchingType, batchSizeLimit} = this.state;

    if (!this.validateCommitInputs()) {
      return;
    }

    let nodes = [];
    let excludeNodes = [];
    let ugType = 0;

    // Choose request type that creates the smallest payload
    if (selected.length < excluded.length) {
      nodes = selected;
      ugType = UpgradeGroupType.NODES;
    } else {
      excludeNodes = excluded;
      ugType = UpgradeGroupType.NETWORK;
    }

    // Get the simultaneous upgrade limit
    // 0 = unlimited batch size
    // -1 = upgrade all at once
    const limit =
      batchingType === BatchingType.AUTO_LIMITED
        ? formParseInt(batchSizeLimit)
        : batchingType === BatchingType.ALL_AT_ONCE
        ? -1
        : 0;

    const requestId = 'NMS' + new Date().getTime();
    const data = {
      excludeNodes,
      limit,
      nodes,
      retryLimit: formParseInt(this.state.retryLimit),
      skipFailure: this.state.skipFailure,
      skipPopFailure: this.state.skipPopFailure,
      skipLinks: [],
      timeout: formParseInt(this.state.timeout),
      ugType,
      urReq: {
        scheduleToCommit: formParseInt(this.state.commitDelay),
        upgradeReqId: requestId,
        urType: UpgradeReqType.COMMIT_UPGRADE,
      },
      version: '',
    };

    apiServiceRequest(this.props.networkName, 'sendUpgradeRequest', data)
      .then(_ =>
        swal({
          type: 'info',
          title: 'Commit Upgrade Submitted',
          text: `You have initiated the "Commit Upgrade" process with requestId ${requestId}.\n\nThe status of your request can be found in in the "Node Upgrade Status" table.`,
        }),
      )
      .catch(error => {
        const errorText = getErrorTextFromE2EAck(error);
        swal({
          type: 'error',
          title: 'Commit Upgrade Failed',
          text: `Your upgrade command failed with the following message:\n\n${errorText}.`,
        });
      });

    this.handleClose();
  };

  resetBatchSizeLimit = batchingType => {
    if (batchingType !== BatchingType.AUTO_LIMITED) {
      this.setState({batchSizeLimit: 1});
    }
  };

  render() {
    const {classes} = this.props;
    const {showAdvanced} = this.state;

    const inputs = [
      {
        func: createNumericInput,
        label: 'Upgrade Timeout',
        adornment: {
          endAdornment: <InputAdornment position="end">s</InputAdornment>,
        },
        value: 'timeout',
        step: 1,
      },
      {
        func: createRadioGroupInput,
        label: 'Batching Algorithm',
        onChange: this.resetBatchSizeLimit,
        choices: [
          {
            label: 'Automatic Unlimited (No Size Limit)',
            value: BatchingType.AUTO_UNLIMITED,
            color: 'primary',
          },
          {
            label: 'Automatic Limited',
            value: BatchingType.AUTO_LIMITED,
            color: 'primary',
          },
          {
            label: 'All at Once',
            value: BatchingType.ALL_AT_ONCE,
            color: 'primary',
          },
        ],
        value: 'batchingType',
      },
      ...(this.state.batchingType === BatchingType.AUTO_LIMITED
        ? [
            {
              func: createNumericInput,
              label: 'Batch Size Limit',
              adornment: {
                endAdornment: (
                  <InputAdornment position="end">node(s)</InputAdornment>
                ),
              },
              value: 'batchSizeLimit',
              step: 1,
            },
          ]
        : []),
      {
        func: createCheckboxGroupInput,
        label: 'Failure Handling',
        choices: [
          {
            label: 'Skip Failures',
            value: 'skipFailure',
            color: 'primary',
          },
          {
            label: 'Skip POP Failures',
            value: 'skipPopFailure',
            color: 'primary',
          },
        ],
      },
    ];

    const advancedInputs = [
      {
        func: createNumericInput,
        label: 'Retry Limit',
        value: 'retryLimit',
        step: 1,
      },
      {
        func: createNumericInput,
        label: 'Commit Delay',
        adornment: {
          endAdornment: <InputAdornment position="end">s</InputAdornment>,
        },
        value: 'commitDelay',
        step: 1,
      },
    ];

    return (
      <div className={classes.root}>
        <Button
          className={classes.button}
          onClick={this.handleOpen}
          variant="outlined">
          Commit
          <UpdateIcon className={classes.rightIcon} />
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          onEnter={this.handleEnter}
          modalTitle="Commit Nodes"
          modalContentText="Nodes to commit for upgrade:"
          modalContent={
            <>
              <InsetPaper className={classes.insetPaper} depression={1} rounded>
                {this.props.selected.map(nodeName => (
                  <Chip
                    className={classes.chip}
                    key={nodeName}
                    label={nodeName}
                  />
                ))}
              </InsetPaper>

              {inputs.map(input =>
                input.func({...input}, this.state, this.setState.bind(this)),
              )}

              <Collapse in={showAdvanced}>
                {advancedInputs.map(input =>
                  input.func({...input}, this.state, this.setState.bind(this)),
                )}
              </Collapse>
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={showAdvanced}
                    onChange={this.handleShowAdvanced}
                  />
                }
                label="Show Advanced"
              />
            </>
          }
          modalActions={
            <>
              <Button
                className={classes.button}
                onClick={this.handleSubmitCommit}
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

export default withStyles(styles)(ModalCommit);
