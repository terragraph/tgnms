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
import GetAppIcon from '@material-ui/icons/GetApp';
import InputAdornment from '@material-ui/core/InputAdornment';
import InsetPaper from '../../components/common/InsetPaper';
import MaterialModal from '../../components/common/MaterialModal';
import MaterialReactSelect from '../../components/common/MaterialReactSelect';
import React from 'react';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import swal from 'sweetalert2';
import {UPGRADE_IMAGE_REFRESH_INTERVAL} from '../../constants/UpgradeConstants';
import {
  UpgradeGroupType,
  UpgradeReqType,
} from '../../../thrift/gen-nodejs/Controller_types';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {
  createCheckboxGroupInput,
  createNumericInput,
  formParseInt,
} from '../../helpers/FormHelpers';
import {ctrlVerAfter, shortenVersionString} from '../../helpers/VersionHelper';
import {fetchUpgradeImages} from '../../helpers/UpgradeHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {UpgradeImageType} from '../../../shared/types/Controller';
import type {Version} from '../../helpers/VersionHelper';

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
  formError: {
    color: theme.palette.error.main,
  },
  formWarning: {
    color: theme.palette.warning.dark,
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
  batchSizeLimit: 1,
  downloadLimit: -1,
  downloadTimeout: 180,
  isParallel: true,
  maxConnections: -1,
  retryLimit: 3,
  selectedImage: null,
  skipFailure: true,
  timeout: 180,
  uploadLimit: -1,
});

type Props = {
  classes: Object,
  controllerVersion: Version,
  selected: Array<string>,
  networkName: string,
};

type State = {
  batchSizeLimit: number,
  downloadLimit: number,
  downloadTimeout: number,
  formErrors: {[string]: string},
  isOpen: boolean,
  isParallel: boolean,
  maxConnections: number,
  retryLimit: number,
  selectedImage: ?UpgradeImageType,
  showAdvanced: boolean,
  skipFailure: boolean,
  timeout: number,
  upgradeImages: Array<UpgradeImageType>,
  uploadLimit: number,
};

class ModalPrepare extends React.Component<Props, State> {
  _intervalID: IntervalID = setInterval(
    this.handleFetchImages,
    UPGRADE_IMAGE_REFRESH_INTERVAL,
  );

  state = {
    formErrors: {},
    isOpen: false,
    showAdvanced: false,
    upgradeImages: [],
    ...initState,
  };

  componentDidMount = () => {
    this.handleFetchImages();
  };

  componentWillUnmount = () => {
    clearInterval(this._intervalID);
  };

  shouldComponentUpdate = (_prevProps, prevState) => {
    const {isOpen} = this.state;

    // Don't re-render the component if the upgradeImages list is updated while
    // the modal is closed
    return isOpen || prevState.isOpen != isOpen;
  };

  handleFetchImages = () => {
    fetchUpgradeImages(this.props.networkName, images =>
      this.setState({upgradeImages: images}),
    );
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

  validatePrepareInputs = () => {
    // Validate some inputs to the PREPARE request
    const {isParallel} = this.state;

    const errors = {};

    // Check batch size if not running in parallel
    if (!isParallel) {
      const batchSizeLimit = formParseInt(this.state.batchSizeLimit);
      if (batchSizeLimit === null || batchSizeLimit < 1) {
        errors.batchSizeLimit = 'Please enter a positive number';
      }
    }

    if (Object.keys(errors).length > 0) {
      this.setState({formErrors: errors});
      return false;
    }

    return true;
  };

  handleSubmitPrepare = () => {
    // Validate form fields
    if (!this.validatePrepareInputs()) {
      return;
    }

    const {batchSizeLimit, isParallel, selectedImage} = this.state;

    // Shouldn't happen, since the "submit" button is disabled when the
    // selectedImage is null.
    if (!selectedImage) {
      return;
    }

    // Get the simultaneous upgrade limit
    // 0 = unlimited batch size
    const limit = isParallel ? 0 : formParseInt(batchSizeLimit);

    const requestID = 'NMS' + new Date().getTime();
    const data = {
      limit,
      nodes: this.props.selected,
      retryLimit: formParseInt(this.state.retryLimit),
      skipFailure: this.state.skipFailure,
      skipLinks: [],
      timeout: formParseInt(this.state.timeout),
      ugType: UpgradeGroupType.NODES,
      urReq: {
        hardwareBoardIds:
          selectedImage.hardwareBoardIds &&
          selectedImage.hardwareBoardIds.length
            ? selectedImage.hardwareBoardIds
            : [],
        imageUrl: selectedImage.magnetUri,
        md5: selectedImage.md5,
        torrentParams: {
          downloadLimit: formParseInt(this.state.downloadLimit),
          downloadTimeout: formParseInt(this.state.downloadTimeout),
          maxConnections: formParseInt(this.state.maxConnections),
          uploadLimit: formParseInt(this.state.uploadLimit),
        },
        upgradeReqId: requestID,
        urType: UpgradeReqType.PREPARE_UPGRADE,
      },
      version: '',
    };

    apiServiceRequest(this.props.networkName, 'sendUpgradeRequest', data)
      .then(
        swal({
          type: 'info',
          title: 'Prepare Upgrade Initiated',
          text: `You have initiated the "Prepare Upgrade" process, with request ID: ${requestID}.\n\nThe status of your request can be found in the "Node Upgrade Status" table.`,
        }),
      )
      .catch(error => {
        const errorText = getErrorTextFromE2EAck(error);
        swal({
          type: 'error',
          title: 'Prepare Upgrade Failed',
          text: `Your upgrade command failed with the following message:\n\n${errorText}.`,
        });
      });

    this.handleClose();
  };

  handleSelectImage = selectedOption => {
    this.setState({selectedImage: selectedOption?.image});
  };

  resetBatchSizeLimit = isParallel => {
    if (isParallel) {
      this.setState({batchSizeLimit: 1});
    }
  };

  render() {
    const {classes} = this.props;
    const {formErrors, selectedImage, showAdvanced} = this.state;

    const imageOptions = this.state.upgradeImages.map(image => ({
      label: shortenVersionString(image.name),
      value: image.name,
      image,
    }));

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
    ];

    const advancedInputs = [
      {
        func: createNumericInput,
        label: 'Retry Limit',
        value: 'retryLimit',
        step: 1,
      },
      {
        func: createCheckboxGroupInput,
        value: '_', // Add a placeholder value to please @flow
        choices: [
          {
            label: 'Skip Failures',
            value: 'skipFailure',
            color: 'primary',
          },
          {
            label: 'Fully Parallelize Upgrade',
            value: 'isParallel',
            color: 'primary',
            onChange: this.resetBatchSizeLimit,
          },
        ],
      },
      ...(!this.state.isParallel
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
        func: createNumericInput,
        label: 'Download Timeout',
        adornment: {
          endAdornment: <InputAdornment position="end">s</InputAdornment>,
        },
        value: 'downloadTimeout',
        step: 1,
      },
      {
        func: createNumericInput,
        label: 'Max Download Speed',
        adornment: {
          endAdornment: <InputAdornment position="end">B/s</InputAdornment>,
        },
        helperText: '-1 for Unlimited',
        value: 'downloadLimit',
        step: 1,
      },
      {
        func: createNumericInput,
        label: 'Max Upload Speed',
        adornment: {
          endAdornment: <InputAdornment position="end">B/s</InputAdornment>,
        },
        helperText: '-1 for Unlimited',
        value: 'uploadLimit',
        step: 1,
      },
      {
        func: createNumericInput,
        label: 'Max Peer Connections',
        helperText: '-1 for Unlimited',
        value: 'maxConnections',
        step: 1,
      },
    ];

    return (
      <div className={classes.root}>
        <Button
          className={classes.button}
          onClick={this.handleOpen}
          variant="outlined">
          Prepare
          <GetAppIcon className={classes.rightIcon} />
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          onEnter={this.handleEnter}
          modalTitle="Prepare Nodes"
          modalContentText="Nodes to prepare for upgrade:"
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

              <MaterialReactSelect
                isClearable
                onChange={this.handleSelectImage}
                options={imageOptions}
                textFieldProps={{
                  label: 'Select Upgrade Image(s)',
                  InputLabelProps: {shrink: true},
                }}
              />

              {selectedImage &&
              ctrlVerAfter(selectedImage.name, this.props.controllerVersion) ? (
                <Typography variant="subtitle2" className={classes.formWarning}>
                  The image you have chosen is newer than the current controller
                  image
                </Typography>
              ) : null}

              {inputs.map(input => (
                <React.Fragment key={input.value}>
                  {input.func({...input}, this.state, this.setState.bind(this))}
                  <Typography variant="subtitle2" className={classes.formError}>
                    {formErrors[input.value]}
                  </Typography>
                </React.Fragment>
              ))}

              <Collapse in={showAdvanced}>
                {advancedInputs.map(input => (
                  <React.Fragment key={input.value}>
                    {input.func(
                      {...input},
                      this.state,
                      this.setState.bind(this),
                    )}
                    <Typography
                      variant="subtitle2"
                      className={classes.formError}>
                      {formErrors[input.value]}
                    </Typography>
                  </React.Fragment>
                ))}
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
                disabled={!selectedImage}
                onClick={this.handleSubmitPrepare}
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

export default withStyles(styles)(ModalPrepare);
