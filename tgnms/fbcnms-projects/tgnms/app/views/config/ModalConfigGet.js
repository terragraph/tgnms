/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import copy from 'copy-to-clipboard';
import {
  DEFAULT_BASE_KEY,
  DEFAULT_FIRMWARE_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {getFullNodeConfig} from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
import {makeStyles} from '@material-ui/styles';
import {stringifyConfig} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {useConfigTaskContext} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

const useStyles = makeStyles(theme => ({
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
}));

type Props = {
  isOpen: boolean,
  onClose: () => any,
};

export default function ModalConfigGet(props: Props) {
  const {isOpen, onClose} = props;
  const classes = useStyles();
  const {selectedValues, configParams} = useConfigTaskContext();
  const {nodeInfo} = selectedValues;
  const {baseConfigs, firmwareBaseConfigs, hardwareBaseConfigs} = configParams;
  const {networkName, networkConfig} = useNetworkContext();

  const [selectedImage, setSelectedImage] = React.useState(DEFAULT_BASE_KEY);
  const [selectedHardwareType, setSelectedHardwareType] = React.useState(
    DEFAULT_HARDWARE_BASE_KEY,
  );
  const [selectedFirmwareVersion, setSelectedFirmwareVersion] = React.useState(
    DEFAULT_FIRMWARE_BASE_KEY,
  );
  const [error, setError] = React.useState(null);

  const [fullNodeConfig, setFullNodeConfig] = React.useState(null);

  const fetchFullNodeConfig = React.useCallback(() => {
    // Retrieve the full config for the current node
    const data = {
      node: nodeInfo?.name || '',
      swVersion: selectedImage,
      fwVersion: selectedFirmwareVersion,
      hwBoardId: selectedHardwareType,
    };

    const onError = err => setError(err);
    getFullNodeConfig(
      networkName,
      data,
      nodeConfig => setFullNodeConfig(stringifyConfig(nodeConfig)),
      onError,
    );
  }, [
    networkName,
    nodeInfo,
    selectedFirmwareVersion,
    selectedHardwareType,
    selectedImage,
  ]);

  const handleEnter = React.useCallback(() => {
    // Reset the modal state on enter
    // Set default state
    setSelectedImage(
      nodeInfo?.version || networkConfig.controller_version || DEFAULT_BASE_KEY,
    );
    setSelectedFirmwareVersion(
      nodeInfo?.firmwareVersion || DEFAULT_FIRMWARE_BASE_KEY,
    );
    setSelectedHardwareType(
      nodeInfo?.hardwareBoardId || DEFAULT_HARDWARE_BASE_KEY,
    );

    fetchFullNodeConfig();
  }, [fetchFullNodeConfig, networkConfig, nodeInfo]);

  React.useEffect(() => {
    fetchFullNodeConfig();
  }, [
    selectedImage,
    fetchFullNodeConfig,
    selectedFirmwareVersion,
    selectedHardwareType,
  ]);

  const handleCopyConfig = () => {
    // Copy the config to the clipboard
    copy(fullNodeConfig);
  };

  const dedupeConfigs = array => Array.from(new Set(array));

  const baseConfigOptions = baseConfigs
    ? dedupeConfigs(Object.keys(baseConfigs).concat(DEFAULT_BASE_KEY))
    : [DEFAULT_BASE_KEY];

  const firmwareBaseConfigOptions = firmwareBaseConfigs
    ? dedupeConfigs(
        Object.keys(firmwareBaseConfigs).concat(DEFAULT_FIRMWARE_BASE_KEY),
      )
    : [DEFAULT_FIRMWARE_BASE_KEY];

  const hardwareBaseConfigOptions = hardwareBaseConfigs
    ? dedupeConfigs(
        Object.keys(hardwareBaseConfigs).concat(DEFAULT_HARDWARE_BASE_KEY),
      )
    : [DEFAULT_HARDWARE_BASE_KEY];

  const disableButtons = fullNodeConfig === null;

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
      onEnter={handleEnter}
      modalTitle="Full Node Configuration"
      modalContentText={
        <>
          Showing the full configuration for node{' '}
          <strong>{nodeInfo?.name}</strong>:
        </>
      }
      modalContent={
        error ? (
          errorNode
        ) : (
          <>
            <div>
              <TextField
                label="Base Version"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={selectedImage}
                fullWidth
                onChange={e => setSelectedImage(e.target.value)}>
                {baseConfigOptions.map(ver => (
                  <MenuItem key={ver} value={ver}>
                    {ver}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Firmware Version"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={selectedFirmwareVersion}
                fullWidth
                onChange={e => setSelectedFirmwareVersion(e.target.value)}>
                {firmwareBaseConfigOptions.map(ver => (
                  <MenuItem key={ver} value={ver}>
                    {ver}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Hardware Type"
                select
                InputLabelProps={{shrink: true}}
                margin="dense"
                value={selectedHardwareType}
                fullWidth
                onChange={e => setSelectedHardwareType(e.target.value)}>
                {hardwareBaseConfigOptions.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            {error ? (
              errorNode
            ) : (
              <pre className={classes.content}>
                {fullNodeConfig || (
                  <div className={classes.centered}>
                    <CircularProgress />
                  </div>
                )}
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
            onClick={handleCopyConfig}
            disabled={disableButtons}>
            Copy
          </Button>
        </>
      }
    />
  );
}
