/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import Collapse from '@material-ui/core/Collapse';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import InsetPaper from '@fbcnms/tg-nms/app/components/common/InsetPaper';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MaterialReactSelect from '@fbcnms/tg-nms/app/components/common/MaterialReactSelect';
import React from 'react';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import swal from 'sweetalert2';
import {BatchingType} from '@fbcnms/tg-nms/app/constants/UpgradeConstants';
import {UPGRADE_IMAGE_REFRESH_INTERVAL} from '@fbcnms/tg-nms/app/constants/UpgradeConstants';
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
import {
  ctrlVerAfter,
  shortenVersionString,
} from '@fbcnms/tg-nms/app/helpers/VersionHelper';
import {fetchUpgradeImages} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {SoftwareImageType} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';
import type {Version} from '@fbcnms/tg-nms/app/helpers/VersionHelper';

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
  formWarning: {
    color: theme.palette.warning.dark,
  },
  fullUpgradeButton: {
    minWidth: theme.spacing(22),
  },
  insetPaper: {
    margin: `${theme.spacing(0.5)} 0`,
    maxHeight: '200px',
    overflowY: 'auto',
    padding: theme.spacing(0.5),
  },
  rightIcon: {
    marginLeft: theme.spacing(),
  },
});

const initState = Object.freeze({
  batchingType: BatchingType.AUTO_UNLIMITED,
  batchSizeLimit: 1,
  commitDelay: 0,
  downloadLimit: -1,
  downloadTimeout: 180,
  maxConnections: -1,
  retryLimit: 3,
  selectedImage: null,
  skipFailure: true,
  skipPopFailure: false,
  timeout: 180,
  uploadLimit: -1,
  useHttpImage: false,
});

type Props = {
  classes: Object,
  controllerVersion: Version,
  excluded: Array<string>,
  selected: Array<string>,
  networkName: string,
};

type State = {
  batchingType: string,
  batchSizeLimit: number,
  commitDelay: number,
  downloadLimit: number,
  downloadTimeout: number,
  formErrors: {[string]: string},
  isOpen: boolean,
  maxConnections: number,
  retryLimit: number,
  selectedImage: ?SoftwareImageType,
  showAdvanced: boolean,
  skipFailure: boolean,
  skipPopFailure: boolean,
  timeout: number,
  upgradeImages: Array<SoftwareImageType>,
  uploadLimit: number,
  useHttpImage: boolean,
};

class ModalFullUpgrade extends React.Component<Props, State> {
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
    return isOpen || prevState.isOpen != isOpen;
  };

  handleFetchImages = () => {
    fetchUpgradeImages(this.props.networkName, images =>
      this.setState({upgradeImages: images}),
    );
  };

  handleOpen = () => {
    this.setState({isOpen: true});
  };

  handleClose = () => {
    this.setState({isOpen: false, showAdvanced: false});
  };

  handleEnter = () => {
    this.setState(initState);
  };

  handleShowAdvanced = () => {
    this.setState(prevState => ({showAdvanced: !prevState.showAdvanced}));
  };

  validateInputs = () => {
    const {batchingType} = this.state;

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

  handleSubmit = () => {
    const {excluded, selected} = this.props;
    const {
      batchingType,
      batchSizeLimit,
      downloadLimit,
      downloadTimeout,
      maxConnections,
      selectedImage,
      uploadLimit,
    } = this.state;

    if (!this.validateInputs() || !selectedImage) {
      return;
    }

    let nodes = [];
    let excludeNodes = [];
    let ugType;

    if (selected.length < excluded.length) {
      nodes = selected;
      ugType = UpgradeGroupType.NODES;
    } else {
      excludeNodes = excluded;
      ugType = UpgradeGroupType.NETWORK;
    }

    const limit =
      batchingType === BatchingType.AUTO_LIMITED
        ? formParseInt(batchSizeLimit)
        : batchingType === BatchingType.ALL_AT_ONCE
        ? -1
        : 0;

    const requestId = 'NMS' + new Date().getTime();

    const data = {
      ugType,
      nodes,
      excludeNodes,
      urReq: {
        urType: UpgradeReqType.FULL_UPGRADE,
        upgradeReqId: requestId,
        md5: selectedImage.md5,
        imageUrl: this.state.useHttpImage
          ? selectedImage.httpUri
          : selectedImage.magnetUri,
        scheduleToCommit: formParseInt(this.state.commitDelay),
        torrentParams: {
          downloadLimit: formParseInt(downloadLimit),
          downloadTimeout: formParseInt(downloadTimeout),
          maxConnections: formParseInt(maxConnections),
          uploadLimit: formParseInt(uploadLimit),
        },
        hardwareBoardIds:
          selectedImage.hardwareBoardIds &&
          selectedImage.hardwareBoardIds.length
            ? selectedImage.hardwareBoardIds
            : [],
      },
      timeout: formParseInt(this.state.timeout),
      skipFailure: this.state.skipFailure,
      skipPopFailure: this.state.skipPopFailure,
      version: selectedImage.name ?? '',
      skipLinks: [],
      limit,
      retryLimit: formParseInt(this.state.retryLimit),
    };

    this.submitApiServiceRequest(data)
      .then(_ => {
        swal({
          type: 'info',
          title: 'Full Upgrade Submitted',
          text: `You have initiated the "Full Upgrade" process with requestId ${requestId}.\n\nThe status of your request can be found in in the "Node Upgrade Status" table.`,
        });
      })
      .catch(error => {
        const errorText = getErrorTextFromE2EAck(error);
        swal({
          type: 'error',
          title: 'Full Upgrade Failed',
          text: `Your upgrade command failed with the following message:\n\n${errorText}.`,
        });
      });

    this.handleClose();
  };

  submitApiServiceRequest(data) {
    return new Promise((resolve, reject) => {
      apiServiceRequest(this.props.networkName, 'sendUpgradeRequest', data)
        .then(_response =>
          resolve({
            success: true,
          }),
        )
        .catch(er =>
          reject({
            success: false,
            msg: getErrorTextFromE2EAck(er),
          }),
        );
    });
  }

  resetBatchSizeLimit = batchingType => {
    if (batchingType !== BatchingType.AUTO_LIMITED) {
      this.setState({batchSizeLimit: 1});
    }
  };

  handleSelectImage = selectedOption => {
    this.setState({
      selectedImage: selectedOption?.image,
      useHttpImage: false /* reset after image is selected */,
    });
  };

  setDownloadMechanism = isHttpUri => {
    this.setState({useHttpImage: isHttpUri === 'true' ? true : false});
  };

  render() {
    const {classes} = this.props;
    const {selectedImage, showAdvanced, upgradeImages} = this.state;

    const imageOptions = upgradeImages.map(image => ({
      label: shortenVersionString(image.name),
      value: image.name,
      image,
    }));
    const httpDownloadEnabled = selectedImage && selectedImage.httpUri;

    const advancedInputs = [
      {
        func: createRadioGroupInput,
        label: 'Download Protocol',
        helperText:
          !httpDownloadEnabled &&
          'To enable HTTP-based downloads, set the controller config flag "upgrade_image_http_path"',
        value: 'useHttpImage',
        onChange: this.setDownloadMechanism,
        choices: [
          {
            label: 'BitTorrent',
            value: false,
          },
          {
            label: 'HTTP',
            value: true,
            disabled: !httpDownloadEnabled,
          },
        ],
      },
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
      {
        func: createNumericInput,
        label: 'Retry Limit',
        value: 'retryLimit',
        step: 1,
      },
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
          className={classNames(classes.button, classes.fullUpgradeButton)}
          onClick={this.handleOpen}
          variant="outlined">
          Full Upgrade
          <AddIcon className={classes.rightIcon} />
        </Button>
        <MaterialModal
          open={this.state.isOpen}
          onClose={this.handleClose}
          onEnter={this.handleEnter}
          modalTitle="Full Upgrade Nodes"
          modalContentText="Nodes for upgrade:"
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
                id="imageSelector"
                isClearable
                onChange={this.handleSelectImage}
                options={imageOptions}
                textFieldProps={{
                  label: 'Select Upgrade Image',
                  InputLabelProps: {shrink: true},
                }}
                wrapOptions={true}
              />

              {selectedImage &&
              ctrlVerAfter(selectedImage.name, this.props.controllerVersion) ? (
                <Typography variant="subtitle2" className={classes.formWarning}>
                  The image you have chosen is newer than the current controller
                  image
                </Typography>
              ) : null}

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
                disabled={!selectedImage}
                onClick={this.handleSubmit}
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

export default withStyles(styles)(ModalFullUpgrade);
