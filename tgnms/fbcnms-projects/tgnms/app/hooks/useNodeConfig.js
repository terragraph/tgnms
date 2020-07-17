/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import {
  ConfigLayer,
  DEFAULT_BASE_KEY,
  DEFAULT_FIRMWARE_BASE_KEY,
  DEFAULT_HARDWARE_BASE_KEY,
} from '../constants/ConfigConstants';
import {cloneDeep, get, merge} from 'lodash';
import {convertType} from '../helpers/ObjectHelpers';
import {
  getAutoOverridesConfig,
  getBaseConfig,
  getConfigMetadata,
  getFirmwareBaseConfig,
  getHardwareBaseConfig,
  getNetworkOverridesConfig,
  getNodeOverridesConfig,
} from '../apiutils/ConfigAPIUtil';
import {getNodeVersions, processConfigs} from '../helpers/ConfigHelpers';
import {useNetworkContext} from '../contexts/NetworkContext';

import type {
  ConfigDataType,
  ConfigParamsType,
} from '../contexts/ConfigTaskContext';

export function useNodeConfig({
  nodeName,
}: {
  nodeName: ?string,
}): {
  loading: boolean,
  configData: ?Array<ConfigDataType>,
  configParams: ?ConfigParamsType,
} {
  const {networkName, networkConfig} = useNetworkContext();
  const [loading, setLoading] = React.useState(true);
  const [configData, setConfigData] = React.useState(null);
  const [configParams, setConfigParams] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);

    async function getConfigData() {
      const configParams = await getConfigParams({networkName, networkConfig});
      setConfigParams(configParams);
    }

    getConfigData();
    if (!configParams) {
      return;
    }

    const baseConfig = configParams.baseConfigs
      ? configParams.baseConfigs[DEFAULT_BASE_KEY]
      : {};
    const firmwareOverrides =
      configParams.firmwareBaseConfigs &&
      configParams.firmwareBaseConfigs[DEFAULT_FIRMWARE_BASE_KEY]
        ? configParams.firmwareBaseConfigs[DEFAULT_FIRMWARE_BASE_KEY]
        : {};
    const hardwareOverrides = get(
      configParams.hardwareBaseConfigs,
      [DEFAULT_HARDWARE_BASE_KEY, DEFAULT_BASE_KEY],
      {},
    );

    const baseLayer = merge(
      cloneDeep(baseConfig),
      firmwareOverrides,
      hardwareOverrides,
    );

    const layers = [
      {id: ConfigLayer.BASE, value: baseLayer},
      {
        id: ConfigLayer.AUTO_NODE,
        value: get(configParams.autoOverridesConfig, nodeName, {}),
      },
      {
        id: ConfigLayer.NETWORK,
        value: configParams.networkOverridesConfig || {},
      },
      {
        id: ConfigLayer.NODE,
        value: get(configParams.nodeOverridesConfig, nodeName, {}),
      },
      {
        id: ConfigLayer.DRAFT,
        value:
          nodeName != null
            ? configParams.nodeOverridesConfig[nodeName]
            : configParams.networkOverridesConfig || {},
      },
    ];

    const processedConfigData = processConfigs(layers, configParams.metadata);

    setConfigData(convertType<Array<ConfigDataType>>(processedConfigData));
    setLoading(false);
  }, [networkConfig, networkName, nodeName, configParams]);

  return {loading, configData, configParams};
}

async function getConfigParams({networkName, networkConfig}) {
  const handleError = error => console.error(error);

  const baseConfigData = {
    swVersions: [DEFAULT_BASE_KEY, ...getNodeVersions(networkConfig)],
    hwBoardIds: [],
  };
  const firmwareData = {
    apiData: {fwVersions: []},
    ctrlVersion: networkConfig.controller_version,
    defaultCfg: {none: {}},
  };

  const data = await Promise.all([
    new Promise((resolve, _) => {
      getConfigMetadata(
        networkName,
        res => resolve({metadata: res}),
        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getAutoOverridesConfig(
        networkName,
        res => resolve({autoOverridesConfig: res}),

        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getHardwareBaseConfig(
        networkName,
        baseConfigData,
        res => resolve({hardwareBaseConfig: res}),
        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getNetworkOverridesConfig(
        networkName,
        res => resolve({networkOverridesConfig: res}),
        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getNodeOverridesConfig(
        networkName,
        res => resolve({nodeOverridesConfig: res}),
        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getBaseConfig(
        networkName,
        baseConfigData,
        res => resolve({nodeOverridesConfig: res}),
        handleError,
      );
    }),
    new Promise((resolve, _) => {
      getFirmwareBaseConfig(
        networkName,
        firmwareData,
        res => resolve({nodeOverridesConfig: res}),
        handleError,
      );
    }),
  ]);

  return data.reduce((final, result) => {
    return merge(final, result);
  }, {});
}
