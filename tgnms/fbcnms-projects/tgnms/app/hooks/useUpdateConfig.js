/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {getDraftConfig} from '../helpers/ConfigHelpers';
import {
  setAggregatorConfig,
  setControllerConfig,
  setNetworkOverridesConfig,
  setNodeOverridesConfig,
} from '../apiutils/ConfigAPIUtil';
import {useNetworkContext} from '../contexts/NetworkContext';
import {useSnackbars} from './useSnackbar';

import type {ControllerConfigType} from '../../shared/types/Controller';
import type {NodeConfigType} from '../../shared/types/NodeConfig';

type updateConfigInput<T, K> = {
  drafts: $Shape<T>,
  currentConfig: T,
  jsonConfig?: ?$Shape<K>,
};

type configToSubmitInput<T> = {drafts: T, currentConfig: T, jsonConfig?: ?T};

export function useUpdateConfig() {
  const {networkName} = useNetworkContext();
  const snackbars = useSnackbars();

  const onSuccess = React.useCallback(
    () =>
      snackbars.success(
        'Config successfully changed! Please wait a few moments for the config to update.',
      ),
    [snackbars],
  );
  const onError = React.useCallback(
    err => snackbars.error('Config change failed: ' + err),
    [snackbars],
  );

  const updateNetworkConfig = React.useCallback(
    (input: updateConfigInput<NodeConfigType, NodeConfigType>) => {
      const {drafts, currentConfig, jsonConfig} = input;
      const networkDraftConfig = getConfigToSubmit<NodeConfigType>({
        jsonConfig,
        drafts,
        currentConfig,
      });

      setNetworkOverridesConfig(
        networkName,
        networkDraftConfig,
        onSuccess,
        onError,
      );
    },
    [networkName, onError, onSuccess],
  );

  const updateNodeConfig = React.useCallback(
    (input: updateConfigInput<{[string]: NodeConfigType}, NodeConfigType>) => {
      const {drafts, currentConfig, jsonConfig} = input;

      const nodeDraftConfig = Object.keys(drafts).reduce((result, nodeName) => {
        const nodeDrafts: $Shape<NodeConfigType> =
          drafts.hasOwnProperty(nodeName) && typeof nodeName == 'string'
            ? drafts[nodeName]
            : {};

        result[nodeName] = getConfigToSubmit<NodeConfigType>({
          jsonConfig,
          drafts: nodeDrafts,
          currentConfig: currentConfig[nodeName],
        });
        return result;
      }, {});

      setNodeOverridesConfig(networkName, nodeDraftConfig, onSuccess, onError);
    },
    [networkName, onError, onSuccess],
  );

  const updateControllerConfig = React.useCallback(
    (input: updateConfigInput<ControllerConfigType, ControllerConfigType>) => {
      const {drafts, currentConfig, jsonConfig} = input;

      const controllerDraftConfig = getConfigToSubmit<ControllerConfigType>({
        jsonConfig,
        drafts,
        currentConfig,
      });
      setControllerConfig(
        networkName,
        controllerDraftConfig,
        onSuccess,
        onError,
      );
    },
    [networkName, onError, onSuccess],
  );

  const updateAggregatorConfig = React.useCallback(
    (input: updateConfigInput<ControllerConfigType, ControllerConfigType>) => {
      const {drafts, currentConfig, jsonConfig} = input;

      const aggregatorDraftConfig = getConfigToSubmit<ControllerConfigType>({
        jsonConfig,
        drafts,
        currentConfig,
      });
      setAggregatorConfig(
        networkName,
        aggregatorDraftConfig,
        onSuccess,
        onError,
      );
    },
    [networkName, onError, onSuccess],
  );

  return React.useMemo(
    () => ({
      network: updateNetworkConfig,
      node: updateNodeConfig,
      controller: updateControllerConfig,
      aggregator: updateAggregatorConfig,
    }),
    [
      updateAggregatorConfig,
      updateControllerConfig,
      updateNetworkConfig,
      updateNodeConfig,
    ],
  );
}

function getConfigToSubmit<T>(input: configToSubmitInput<T>): T {
  const {jsonConfig, drafts, currentConfig} = input;
  if (jsonConfig != null) {
    return jsonConfig;
  }
  const mergedDraftConfig = getDraftConfig<T>({
    currentConfig,
    drafts,
  });

  return mergedDraftConfig;
}
