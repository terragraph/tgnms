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
import {convertType} from '../../helpers/ObjectHelpers';
import {formConfigModes} from '../../constants/ConfigConstants';
import {set} from 'lodash';
import {
  setNetworkOverridesConfig,
  setNodeOverridesConfig,
} from '../../apiutils/ConfigAPIUtil';
import {useNodeConfig} from '../../hooks/useNodeConfig';
import {useSnackbars} from '../../hooks/useSnackbar';

import type {NodeConfigType} from '../../../shared/types/NodeConfig';

export type Props = {
  children: React.Node,
  title?: React.Node,
  description?: React.Node,
  mode?: $Values<typeof formConfigModes>,
  nodeName?: ?string,
  onClose?: () => void,
  advancedLink?: React.Node,
  customText?: string,
};

export default function ConfigTaskForm({
  children,
  title,
  description,
  mode,
  nodeName,
  onClose,
  advancedLink,
  customText,
}: Props) {
  const {loading, configData, configParams} = useNodeConfig({nodeName});
  const {networkName} = React.useContext(NetworkContext);
  const [resetLoading, setResetLoading] = React.useState(false);
  const draftsRef = React.useRef({});
  const configDataRef = React.useRef(configData);
  const snackbars = useSnackbars();

  const handleSubmitConfig = React.useCallback(() => {
    if (mode === formConfigModes.Node && nodeName == null) {
      snackbars.error('Config change failed, please double check the form');
      return;
    }

    const drafts = draftsRef.current;

    const onSuccess = () =>
      snackbars.success(
        'Config successfully changed! Please wait a few moments for the config to update.',
      );
    const onError = err => snackbars.error('Config change failed: ' + err);

    if (mode === formConfigModes.Network) {
      const draftConfig = GetDraftConfig({
        nodeName,
        configParams,
        drafts,
      });
      const networkDraftConfig: NodeConfigType = convertType<NodeConfigType>(
        draftConfig,
      );

      setNetworkOverridesConfig(
        networkName,
        networkDraftConfig,
        onSuccess,
        onError,
      );
    } else if (mode === formConfigModes.MultiNode) {
      const nodeConfig = Object.keys(drafts).reduce((result, nodeName) => {
        const draftConfig = GetDraftConfig({
          nodeName,
          configParams,
          drafts:
            drafts.hasOwnProperty(nodeName) && typeof nodeName == 'string'
              ? drafts[nodeName]
              : {},
        });

        result[nodeName] = draftConfig;
        return result;
      }, {});

      setNodeOverridesConfig(networkName, nodeConfig, onSuccess, onError);
    } else if (nodeName) {
      const draftConfig = GetDraftConfig({
        nodeName,
        configParams,
        drafts,
      });
      const nodeConfig = {[nodeName]: draftConfig};
      setNodeOverridesConfig(networkName, nodeConfig, onSuccess, onError);
    }
    if (onClose) {
      onClose();
    }
  }, [
    onClose,
    configParams,
    draftsRef,
    networkName,
    nodeName,
    mode,
    snackbars,
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
    configDataRef.current = configData;
    draftsRef.current = {};
    setResetLoading(false);
  }, [mode, configData]);

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
            (mode !== formConfigModes.Network && nodeName != null
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
              {customText ?? 'Submit'}
            </Button>
          </Grid>
        </Grid>
        {advancedLink}
      </Grid>
    </Grid>
  );
}

function GetDraftConfig({nodeName, configParams, drafts}) {
  const draftConfig = nodeName
    ? configParams?.nodeOverridesConfig[nodeName] || {}
    : configParams?.networkOverridesConfig;
  Object.keys(drafts).forEach(configField => {
    set(draftConfig, configField.split('.'), drafts[configField]);
  });

  return draftConfig;
}
