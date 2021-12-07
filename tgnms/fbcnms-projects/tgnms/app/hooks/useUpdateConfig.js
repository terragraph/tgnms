/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {cloneDeep, unset} from 'lodash';
import {getDraftConfig} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {
  setAggregatorConfig,
  setControllerConfig,
  setNetworkOverridesConfig,
  setNodeOverridesConfig,
} from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useSnackbars} from './useSnackbar';

import type {ControllerConfigType} from '@fbcnms/tg-nms/shared/types/Controller';
import type {NodeConfigType} from '@fbcnms/tg-nms/shared/types/NodeConfig';

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

  /**
   * Deletes a field from the config and saves it.
   *
   * Ex. currentConfig is {my: {config: {field: 0, other: 1}}}
   * Calling deleteConfigField('node', ['my.config.field'], currentConfig)
   * will update so the config is now {my: {config: {other: 1}}}
   */
  const deleteConfigField = React.useCallback(
    ({
      type,
      paths,
      currentConfig,
    }: {
      type: $Values<typeof FORM_CONFIG_MODES>,
      paths: Array<string>,
      currentConfig: any,
    }) => {
      const currentConfigCopy = cloneDeep(currentConfig) ?? {};
      const draftConfig: any = {};
      paths.forEach(path => {
        const key = path.split('.')[0];
        // We only want to include the fields that need updating.
        draftConfig[key] = currentConfigCopy[key];
        unset(draftConfig, path);
      });

      switch (type) {
        case FORM_CONFIG_MODES.NETWORK:
          setNetworkOverridesConfig(
            networkName,
            draftConfig,
            onSuccess,
            onError,
          );
          break;
        case FORM_CONFIG_MODES.AGGREGATOR:
          setAggregatorConfig(networkName, draftConfig, onSuccess, onError);
          break;
        case FORM_CONFIG_MODES.CONTROLLER:
          setControllerConfig(networkName, draftConfig, onSuccess, onError);
          break;
        case FORM_CONFIG_MODES.NODE:
        case FORM_CONFIG_MODES.MULTINODE:
          setNodeOverridesConfig(networkName, draftConfig, onSuccess, onError);
          break;
      }
    },
    [networkName, onError, onSuccess],
  );

  return React.useMemo(
    () => ({
      network: updateNetworkConfig,
      node: updateNodeConfig,
      controller: updateControllerConfig,
      aggregator: updateAggregatorConfig,
      delete: deleteConfigField,
    }),
    [
      updateAggregatorConfig,
      updateControllerConfig,
      updateNetworkConfig,
      updateNodeConfig,
      deleteConfigField,
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
