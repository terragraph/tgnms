/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {
  CONFIG_LAYER,
  DEFAULT_BASE_KEY,
  DEFAULT_FIRMWARE_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {FORM_CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {cloneDeep, get, merge} from 'lodash';
import {
  constructConfigFromMetadata,
  getNodeVersions,
  processConfigs,
} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {convertType} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {
  getAggregatorConfig,
  getAggregatorConfigMetadata,
  getAutoOverridesConfig,
  getBaseConfig,
  getConfigMetadata,
  getControllerConfig,
  getControllerConfigMetadata,
  getFirmwareBaseConfig,
  getHardwareBaseConfig,
  getNetworkOverridesConfig,
  getNodeOverridesConfig,
} from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {
  ConfigDataType,
  ConfigParamsType,
} from '@fbcnms/tg-nms/app/contexts/ConfigTaskContext';

export function useNodeConfig({
  nodeName,
  imageVersion,
  firmwareVersion,
  hardwareType,
  editMode,
}: {
  nodeName?: ?string,
  imageVersion?: ?string,
  firmwareVersion?: ?string,
  hardwareType?: ?string,
  editMode?: $Values<typeof FORM_CONFIG_MODES>,
}): {
  loading: boolean,
  configData: ?Array<ConfigDataType>,
  configParams: $Shape<ConfigParamsType>,
  reloadConfig: () => Promise<void>,
} {
  const {networkName, networkConfig} = useNetworkContext();
  const [loading, setLoading] = React.useState(true);
  const [configData, setConfigData] = React.useState(null);
  const [configParams, setConfigParams] = React.useState(null);
  const networkConfigRef = React.useRef(networkConfig);

  const reloadConfigParams = React.useCallback(async () => {
    const newConfigParams = await getConfigParams({
      networkName,
      networkConfig: networkConfigRef.current,
    });
    setConfigParams(newConfigParams);
  }, [networkName]);
  React.useEffect(() => {
    reloadConfigParams();
  }, [reloadConfigParams]);

  React.useEffect(() => {
    setLoading(true);

    if (!configParams) {
      reloadConfigParams();
      return;
    }

    const firmwareBaseConfig =
      configParams.firmwareBaseConfigs &&
      configParams.firmwareBaseConfigs[
        firmwareVersion ?? DEFAULT_FIRMWARE_BASE_KEY
      ];

    const baseConfig = configParams.baseConfigs
      ? configParams.baseConfigs[imageVersion ?? DEFAULT_BASE_KEY]
      : {};
    const firmwareOverrides = firmwareBaseConfig ?? {};
    const hardwareOverrides = get(
      configParams.hardwareBaseConfigs,
      [
        hardwareType ?? DEFAULT_HARDWARE_BASE_KEY,
        imageVersion ?? DEFAULT_BASE_KEY,
      ],
      {},
    );

    let baseLayer = merge(
      cloneDeep(baseConfig),
      firmwareOverrides,
      hardwareOverrides,
    );

    let metadata = configParams.metadata;
    let draftLayerData = configParams.networkOverridesConfig;
    let networkConfigLayer = configParams.networkOverridesConfig || {};
    if (
      editMode === FORM_CONFIG_MODES.NODE ||
      editMode === FORM_CONFIG_MODES.MULTINODE
    ) {
      draftLayerData = configParams.nodeOverridesConfig
        ? configParams.nodeOverridesConfig[nodeName]
        : {};
    } else if (editMode === FORM_CONFIG_MODES.CONTROLLER) {
      metadata = configParams.controllerConfigMetadata;
      draftLayerData = configParams.controllerConfig;
      baseLayer = constructConfigFromMetadata(
        configParams.controllerConfigMetadata ?? {},
      );
      networkConfigLayer = {};
    } else if (editMode === FORM_CONFIG_MODES.AGGREGATOR) {
      metadata = configParams.aggregatorConfigMetadata;
      draftLayerData = configParams.aggregatorConfig;
      baseLayer = constructConfigFromMetadata(
        configParams.aggregatorConfigMetadata ?? {},
      );
      networkConfigLayer = {};
    }

    const layers = [
      {id: CONFIG_LAYER.BASE, value: baseLayer},
      {
        id: CONFIG_LAYER.AUTO_NODE,
        value: get(configParams.autoOverridesConfig, nodeName, {}),
      },
      {
        id: CONFIG_LAYER.NETWORK,
        value: networkConfigLayer,
      },
    ];

    if (editMode === FORM_CONFIG_MODES.NODE) {
      layers.push({
        id: CONFIG_LAYER.NODE,
        value: get(configParams.nodeOverridesConfig, nodeName, {}),
      });
    } else if (
      editMode === FORM_CONFIG_MODES.AGGREGATOR ||
      editMode === FORM_CONFIG_MODES.CONTROLLER
    ) {
      layers.push({
        id: CONFIG_LAYER.E2E,
        value:
          editMode === FORM_CONFIG_MODES.AGGREGATOR
            ? configParams.aggregatorConfig
            : configParams.controllerConfig,
      });
    }

    layers.push({
      id: CONFIG_LAYER.DRAFT,
      value: draftLayerData || {},
    });

    const processedConfigData = processConfigs(layers, metadata);

    setConfigData(convertType<Array<ConfigDataType>>(processedConfigData));
    setLoading(false);
  }, [
    networkConfigRef,
    networkName,
    nodeName,
    configParams,
    imageVersion,
    firmwareVersion,
    hardwareType,
    editMode,
    reloadConfigParams,
  ]);

  return {
    loading,
    reloadConfig: reloadConfigParams,
    configData,
    configParams: configParams ?? {},
  };
}

async function getConfigParams({networkName, networkConfig}) {
  const baseConfigData = {
    swVersions: [DEFAULT_BASE_KEY, ...getNodeVersions(networkConfig)],
    hwBoardIds: [],
  };
  const firmwareData = {
    apiData: {fwVersions: []},
    ctrlVersion: networkConfig.controller_version,
    defaultCfg: {none: {}},
  };

  const data = await Promise.allSettled([
    new Promise((resolve, reject) => {
      getConfigMetadata(
        networkName,
        res => resolve({nodeConfigMetadata: res, metadata: res}),
        err => reject({promise: 'nodeConfigMetadata', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getAutoOverridesConfig(
        networkName,
        res => resolve({autoOverridesConfig: res}),
        err => reject({promise: 'autoOverridesConfig', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getHardwareBaseConfig(
        networkName,
        baseConfigData,
        res => resolve({hardwareBaseConfigs: res}),
        err => reject({promise: 'hardwareBaseConfigs', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getControllerConfigMetadata(
        networkName,
        res => resolve({controllerConfigMetadata: res}),
        err => reject({promise: 'controllerConfigMetadata', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getControllerConfig(
        networkName,
        res => resolve({controllerConfig: res}),
        err => reject({promise: 'controllerConfig', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getAggregatorConfig(
        networkName,
        res => resolve({aggregatorConfig: res}),
        err => reject({promise: 'aggregatorConfig', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getAggregatorConfigMetadata(
        networkName,
        res => resolve({aggregatorConfigMetadata: res}),
        err => reject({promise: 'aggregatorConfigMetadata', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getNetworkOverridesConfig(
        networkName,
        res => resolve({networkOverridesConfig: res}),
        err => reject({promise: 'networkOverridesConfig', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getNodeOverridesConfig(
        networkName,
        res => resolve({nodeOverridesConfig: res}),
        err => reject({promise: 'nodeOverridesConfig', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getBaseConfig(
        networkName,
        baseConfigData,
        res => resolve({baseConfigs: res}),
        err => reject({promise: 'baseConfigs', error: err}),
      );
    }),
    new Promise((resolve, reject) => {
      getFirmwareBaseConfig(
        networkName,
        firmwareData,
        res => resolve({firmwareBaseConfigs: res}),
        err => reject({promise: 'firmwareBaseConfigs', error: err}),
      );
    }),
  ]);

  return data.reduce((final, result) => {
    if (result.status === 'fulfilled') {
      return merge(final, result.value);
    } else {
      return merge(final, {[result.reason.promise]: null});
    }
  }, {});
}
