/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import MaterialModal from '../../components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import copy from 'copy-to-clipboard';
import {
  DEFAULT_BASE_KEY,
  DEFAULT_FIRMWARE_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
} from '../../constants/ConfigConstants';
import {createSelectInput} from '../../helpers/FormHelpers';
import {
  getBaseConfig,
  getFirmwareBaseConfig,
  getFullNodeConfig,
  getHardwareBaseConfig,
  sendConfigBundleToNode,
} from '../../apiutils/ConfigAPIUtil';
import {stringifyConfig} from '../../helpers/ConfigHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {NetworkConfig} from '../../NetworkContext';
import type {NodeConfigStatusType} from '../../helpers/ConfigHelpers';

const styles = theme => ({
  root: {
    minWidth: 720,
  },
  button: {
    margin: theme.spacing(),
  },
  buttonProgress: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
  },
  buttonProgressContainer: {
    position: 'relative',
  },
  content: {
    maxHeight: `calc(100% - ${theme.spacing(2)}px)`,
    overflowY: 'auto',
    backgroundColor: '#f3f3f3',
    padding: theme.spacing(),
    borderRadius: 4,
  },
  centered: {
    textAlign: 'center',
  },
  red: {
    color: 'red',
  },
});

const SendToNodeupdateState = Object.freeze({
  NONE: 'NONE',
  REQUEST_PENDING: 'REQUEST_PENDING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
});

const initStatePartial = Object.freeze({
  nodeConfig: null,
  error: null,
  nodeupdateState: SendToNodeupdateState.NONE,
});

type Props = {
  classes: {[string]: string},
  isOpen: boolean,
  onClose: () => any,
  networkConfig: NetworkConfig,
  networkName: string,
  nodeInfo: NodeConfigStatusType,
};

type State = {
  nodeConfig: ?string,
  selectedImage: string,
  selectedHardwareType: string,
  selectedFirmwareVersion: string,
  defaultImage: string,
  defaultHardwareType: string,
  defaultFirmwareVersion: string,
  baseConfigs: ?Array<string>,
  firmwareBaseConfigs: ?Array<string>,
  hardwareBaseConfigs: ?Array<string>,
  error: ?string,
  pendingNodeupdateReq: boolean,
  sendToNodeupdateSuccess: boolean,
  nodeupdateState: string,
};

class ModalConfigGet extends React.Component<Props, State> {
  state = {
    ...initStatePartial,
    selectedImage: '',
    selectedHardwareType: '',
    selectedFirmwareVersion: '',
    defaultImage: DEFAULT_BASE_KEY,
    defaultFirmwareVersion: DEFAULT_FIRMWARE_BASE_KEY,
    defaultHardwareType: DEFAULT_HARDWARE_BASE_KEY,

    // Base configs - only load these once (not every onEnter)
    baseConfigs: null,
    firmwareBaseConfigs: null,
    hardwareBaseConfigs: null,
    error: null,
    pendingNodeupdateReq: false,
    sendToNodeupdateSuccess: false,
  };

  isBaseConfigLoaded = () => {
    // Returns whether all base configs have been loaded
    const {baseConfigs, hardwareBaseConfigs, firmwareBaseConfigs} = this.state;
    return baseConfigs && hardwareBaseConfigs && firmwareBaseConfigs;
  };

  fetchAllBaseConfigs = () => {
    // Fetch all base configs from the controller
    const {networkName, networkConfig} = this.props;

    const data = {hwBoardIds: [], swVersions: [], fwVersions: []};
    const firmwareData = {
      apiData: {fwVersions: []},
      ctrlVersion: networkConfig.controller_version,
      defaultCfg: {none: {}},
    };

    const onError = error => this.setState({error});
    getBaseConfig(
      networkName,
      data,
      baseConfigs =>
        this.setState({
          baseConfigs: baseConfigs ? Object.keys(baseConfigs) : null,
        }),
      onError,
    );
    getHardwareBaseConfig(
      networkName,
      data,
      hardwareBaseConfigs =>
        this.setState({
          hardwareBaseConfigs: hardwareBaseConfigs
            ? Object.keys(hardwareBaseConfigs)
            : null,
        }),
      onError,
    );
    getFirmwareBaseConfig(
      networkName,
      firmwareData,
      firmwareBaseConfigs =>
        this.setState({
          firmwareBaseConfigs: firmwareBaseConfigs
            ? Object.keys(firmwareBaseConfigs)
            : null,
        }),
      onError,
    );
  };

  fetchFullNodeConfig = () => {
    // Retrieve the full config for the current node
    const {networkName, nodeInfo} = this.props;
    const {
      selectedImage,
      selectedHardwareType,
      selectedFirmwareVersion,
    } = this.state;

    const data = {
      node: nodeInfo.name,
      swVersion: selectedImage,
      fwVersion: selectedFirmwareVersion,
      hwBoardId: selectedHardwareType,
    };
    const onError = error => this.setState({error});
    getFullNodeConfig(
      networkName,
      data,
      nodeConfig => this.setState({nodeConfig: stringifyConfig(nodeConfig)}),
      onError,
    );
  };

  handleSendConfigToNode = () => {
    // Send the config to the node via the nodeupdate service
    const {nodeInfo} = this.props;
    const {nodeConfig} = this.state;

    this.setState({nodeupdateState: SendToNodeupdateState.REQUEST_PENDING});
    sendConfigBundleToNode(
      nodeInfo.macAddr,
      nodeConfig,
      () => this.setState({nodeupdateState: SendToNodeupdateState.SUCCESS}),
      err => {
        console.error(
          err.response?.statusText || 'Failed to send configuration to node.',
        );
        this.setState({nodeupdateState: SendToNodeupdateState.FAILURE});
      },
    );
  };

  handleEnter = () => {
    // Reset the modal state on enter
    const {networkConfig, nodeInfo} = this.props;

    // Set default state
    const defaultImage =
      nodeInfo.version || networkConfig.controller_version || DEFAULT_BASE_KEY;
    const defaultFirmwareVersion =
      nodeInfo.firmwareVersion || DEFAULT_FIRMWARE_BASE_KEY;
    const defaultHardwareType =
      nodeInfo.hardwareBoardId || DEFAULT_HARDWARE_BASE_KEY;
    this.setState(
      {
        ...initStatePartial,
        defaultImage,
        defaultFirmwareVersion,
        defaultHardwareType,
        selectedImage: defaultImage,
        selectedFirmwareVersion: defaultFirmwareVersion,
        selectedHardwareType: defaultHardwareType,
      },
      () => {
        // Load base configs if not already loaded
        if (!this.isBaseConfigLoaded()) {
          this.fetchAllBaseConfigs();
        }

        // Fetch full node config using defaults
        this.fetchFullNodeConfig();
      },
    );
  };

  handleCopyConfig = () => {
    // Copy the config to the clipboard
    const {nodeConfig} = this.state;

    copy(nodeConfig);
  };

  renderForm = () => {
    // Render the form
    const {classes} = this.props;
    const {
      baseConfigs,
      hardwareBaseConfigs,
      firmwareBaseConfigs,
      defaultImage,
      defaultFirmwareVersion,
      defaultHardwareType,
    } = this.state;

    const baseConfigOptions = baseConfigs
      ? Array.from(new Set([...baseConfigs, defaultImage]))
      : [defaultImage];

    const firmwareBaseConfigOptions = firmwareBaseConfigs
      ? Array.from(new Set([...firmwareBaseConfigs, defaultFirmwareVersion]))
      : [defaultFirmwareVersion];

    const hardwareBaseConfigOptions = hardwareBaseConfigs
      ? Array.from(new Set([...hardwareBaseConfigs, defaultHardwareType]))
      : [defaultHardwareType];

    const inputs = [
      {
        func: createSelectInput,
        label: 'Base Version',
        value: 'selectedImage',
        menuItems: baseConfigOptions.map(ver => (
          <MenuItem key={ver} value={ver}>
            {ver}
          </MenuItem>
        )),
        onChange: this.fetchFullNodeConfig,
      },
      {
        func: createSelectInput,
        label: 'Firmware Version',
        value: 'selectedFirmwareVersion',
        menuItems: firmwareBaseConfigOptions.map(ver => (
          <MenuItem key={ver} value={ver}>
            {ver}
          </MenuItem>
        )),
        onChange: this.fetchFullNodeConfig,
      },
      {
        func: createSelectInput,
        label: 'Hardware Type',
        value: 'selectedHardwareType',
        menuItems: hardwareBaseConfigOptions.map(type => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        )),
        onChange: this.fetchFullNodeConfig,
      },
    ];

    return (
      <div className={classes.formWrapper}>
        {inputs.map(input =>
          input.func({...input}, this.state, this.setState.bind(this)),
        )}
      </div>
    );
  };

  renderLoading() {
    // Render loading spinner
    const {classes} = this.props;
    return (
      <div className={classes.centered}>
        <CircularProgress />
      </div>
    );
  }

  render() {
    const {classes, isOpen, onClose, nodeInfo} = this.props;
    const {nodeConfig, error, nodeupdateState} = this.state;
    const {name} = nodeInfo;
    const isLoadingBaseConfig = !this.isBaseConfigLoaded();
    const disableButtons = isLoadingBaseConfig || !nodeConfig;

    const nodeupdateButtonText =
      nodeupdateState === SendToNodeupdateState.SUCCESS
        ? 'Staged'
        : nodeupdateState === SendToNodeupdateState.FAILURE
        ? 'Failed'
        : 'Send To Node';
    const errorNode = (
      <Typography variant="subtitle2" className={classes.red}>
        {error}
      </Typography>
    );

    return (
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={onClose}
        onEnter={this.handleEnter}
        modalTitle="Full Node Configuration"
        modalContentText={
          isLoadingBaseConfig ? null : (
            <>
              Showing the full configuration for node <strong>{name}</strong>:
            </>
          )
        }
        modalContent={
          isLoadingBaseConfig ? (
            error ? (
              errorNode
            ) : (
              this.renderLoading()
            )
          ) : (
            <>
              {this.renderForm()}
              {error ? (
                errorNode
              ) : (
                <pre className={classes.content}>
                  {nodeConfig || this.renderLoading()}
                </pre>
              )}
            </>
          )
        }
        modalActions={
          <>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={onClose}>
              Close
            </Button>
            <Button
              className={classes.button}
              variant="outlined"
              onClick={this.handleCopyConfig}
              disabled={disableButtons}>
              Copy
            </Button>
            <Tooltip
              title={
                "This will use Terragraph's external node update service, " +
                'which requires only Internet connectivity on the node ' +
                'instead of a connection to the E2E controller. ' +
                'The service bypasses the normal configuration procedure and ' +
                'is intended for initial setup.'
              }
              placement="top"
              enterDelay={400}>
              <div className={classes.buttonProgressContainer}>
                <Button
                  className={classes.button}
                  variant="outlined"
                  onClick={this.handleSendConfigToNode}
                  disabled={
                    disableButtons ||
                    nodeupdateState !== SendToNodeupdateState.NONE
                  }>
                  {nodeupdateButtonText}
                </Button>
                {nodeupdateState === SendToNodeupdateState.REQUEST_PENDING ? (
                  <CircularProgress
                    className={classes.buttonProgress}
                    size={24}
                  />
                ) : null}
              </div>
            </Tooltip>
          </>
        }
      />
    );
  }
}

export default withStyles(styles)(ModalConfigGet);
