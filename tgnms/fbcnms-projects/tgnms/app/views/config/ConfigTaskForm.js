/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Loading from '@material-ui/core/CircularProgress';
import NetworkContext from '../../contexts/NetworkContext';
import Typography from '@material-ui/core/Typography';
import {Provider as TaskConfigContextProvider} from '../../contexts/ConfigTaskContext';
import {configModes} from '../../constants/ConfigConstants';
import {convertType} from '../../helpers/ObjectHelpers';
import {set} from 'lodash';
import {
  setNetworkOverridesConfig,
  setNodeOverridesConfig,
} from '../../apiutils/ConfigAPIUtil';
import {useEnqueueSnackbar} from '@fbcnms/ui/hooks/useSnackbar';
import {useNodeConfig} from '../../hooks/useNodeConfig';

import type {NodeConfigType} from '../../../shared/types/NodeConfig';

export type Props = {
  children: React.Node,
  title?: React.Node,
  description?: React.Node,
  mode?: $Keys<typeof configModes>,
  nodeName?: ?string,
  onClose?: () => void,
  advancedLink?: React.Node,
};

export default function ConfigTaskForm({
  children,
  title,
  description,
  mode,
  nodeName,
  onClose,
  advancedLink,
}: Props) {
  const {loading, configData, configParams} = useNodeConfig({nodeName});
  const {networkName} = React.useContext(NetworkContext);
  const [resetLoading, setResetLoading] = React.useState(false);
  const enqueueSnackbar = useEnqueueSnackbar();
  const draftsRef = React.useRef({});
  const configDataRef = React.useRef(configData);

  const handleSubmitConfig = React.useCallback(() => {
    const draftConfig = nodeName
      ? configParams?.nodeOverridesConfig[nodeName] || {}
      : configParams?.networkOverridesConfig;

    if (
      draftConfig == null ||
      (mode !== configModes.Network && nodeName == null)
    ) {
      enqueueSnackbar('Config change failed, please double check the form', {
        variant: 'error',
      });
      return;
    }
    Object.keys(draftsRef.current).forEach(configField => {
      set(draftConfig, configField.split('.'), draftsRef.current[configField]);
    });

    const onSuccess = () =>
      enqueueSnackbar(
        'Config successfully changed! Please wait a few moments for the config to update.',
        {variant: 'success'},
      );
    const onError = err =>
      enqueueSnackbar('Config change failed: ' + err, {
        variant: 'error',
      });

    if (mode === configModes.Network) {
      const networkDraftConfig: NodeConfigType = convertType<NodeConfigType>(
        draftConfig,
      );

      setNetworkOverridesConfig(
        networkName,
        networkDraftConfig,
        onSuccess,
        onError,
      );
    } else if (nodeName) {
      const nodeConfig = {[nodeName]: draftConfig};
      setNodeOverridesConfig(networkName, nodeConfig, onSuccess, onError);
    }
    if (onClose) {
      onClose();
    }
  }, [
    onClose,
    configParams,
    enqueueSnackbar,
    draftsRef,
    networkName,
    nodeName,
    mode,
  ]);

  const resetForm = React.useCallback(() => {
    configDataRef.current = null;
    setResetLoading(true);
  }, []);

  const handleCancel = React.useCallback(() => {
    if (onClose) {
      onClose();
    }
    resetForm();
  }, [resetForm, onClose]);

  React.useEffect(() => {
    setResetLoading(true);
    setTimeout(() => {
      resetForm();
    }, 10);
  }, [mode, resetForm, nodeName]);

  React.useEffect(() => {
    if (!configDataRef.current) {
      configDataRef.current = configData;
      draftsRef.current = {};
    }
    setResetLoading(false);
  }, [configData]);

  const handleInputUpdate = React.useCallback(({configField, draftValue}) => {
    draftsRef.current = {...draftsRef.current, [configField]: draftValue};
  }, []);

  if (loading || !configData || resetLoading) {
    return <Loading data-testid="loading" />;
  }

  return (
    <Grid item container direction={'column'} spacing={4}>
      {(title || description) && (
        <Grid item>
          {title && <Typography variant="h6">{title}</Typography>}
          {description && (
            <Typography variant="body2" color="textSecondary">
              {description}
            </Typography>
          )}
        </Grid>
      )}
      <Grid item>
        <TaskConfigContextProvider
          configData={configDataRef.current}
          configMetadata={configParams?.metadata || {}}
          configOverrides={
            (mode !== configModes.Network && nodeName != null
              ? configParams?.nodeOverridesConfig[nodeName]
              : configParams?.networkOverridesConfig) ?? {}
          }
          networkConfigOverride={configParams?.networkOverridesConfig ?? {}}
          onUpdate={handleInputUpdate}>
          {children}
        </TaskConfigContextProvider>
      </Grid>
      <Grid item>
        <Grid container spacing={2} style={{justifyContent: 'flex-end'}}>
          <Grid item>
            <Button
              onClick={handleCancel}
              data-testid="cancel-button"
              variant="text">
              Cancel
            </Button>
          </Grid>
          <Grid item>
            <Button
              type="submit"
              data-testid="submit-button"
              variant="contained"
              color="primary"
              onClick={handleSubmitConfig}
              disabled={Object.values(draftsRef.current).length === 0}>
              Submit
            </Button>
          </Grid>
        </Grid>
        {advancedLink}
      </Grid>
    </Grid>
  );
}
