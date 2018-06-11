/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// util class for making API calls to the node server for network config

import {
  getBaseConfigSuccess,
  getConfigMetadataSuccess,
  getControllerConfigSuccess,
  getControllerConfigMetadataSuccess,
  getNetworkConfigSuccess,
  getNodeConfigSuccess,
  getAggregatorConfigAndMetadataSuccess,
  setControllerConfigSuccess,
  setNetworkConfigSuccess,
  setNodeConfigSuccess,
  setAggregatorConfigSuccess,
  showConfigError,
} from '../actions/NetworkConfigActions.js';
import {DEFAULT_BASE_KEY} from '../constants/NetworkConfigConstants.js';
import {sortConfig, sortConfigByTag} from '../helpers/NetworkConfigHelpers.js';
import axios from 'axios';
import isPlainObject from 'lodash-es/isPlainObject';
import pick from 'lodash-es/pick';

const getErrorText = error => {
  // try to get the status text from the API response, otherwise, default to the error object
  return error.response && error.response.statusText
    ? error.response.statusText
    : error;
};

function apiServiceRequest(
  topologyName: string,
  apiMethod: string,
  data: Object = {},
) {
  // All apiservice requests are POST, and expect at least an empty dict.
  return axios.post(
    `/apiservice/${topologyName}/api/${apiMethod}`,
    (data = data),
  );
}

export const getConfigsForTopology = (
  topologyName,
  swVersions,
  getNetworkAndNodeConfig,
) => {
  const data = {swVersions: [DEFAULT_BASE_KEY, ...swVersions]};
  apiServiceRequest(topologyName, 'getBaseConfig', data).then(response => {
    const {config} = response.data;
    const parsedConfig = JSON.parse(config);
    // assume here that it's a map of base version to config object
    const cleanedConfig = {};
    Object.keys(parsedConfig).forEach(baseVersion => {
      const configValue = isPlainObject(parsedConfig[baseVersion])
        ? parsedConfig[baseVersion]
        : {};
      cleanedConfig[baseVersion] = configValue;
    }, {});

    getBaseConfigSuccess({
      config: sortConfig(cleanedConfig),
      topologyName,
    });
  });

  if (getNetworkAndNodeConfig) {
    getNetworkOverrideConfig(topologyName);
    getNodeOverrideConfig(topologyName);
  }
};

export const getConfigMetadata = topologyName => {
  apiServiceRequest(topologyName, 'getControllerConfigMetadata').then(
    response => {
      const {metadata} = response.data;
      const parsedMetadata = JSON.parse(metadata);

      getConfigMetadataSuccess({
        metadata: parsedMetadata,
        topologyName,
      });
    },
  );
};

export const getNetworkOverrideConfig = topologyName => {
  apiServiceRequest(topologyName, 'getNetworkOverridesConfig').then(
    response => {
      const {overrides} = response.data;
      const cleanedOverride = isPlainObject(JSON.parse(overrides))
        ? JSON.parse(overrides)
        : {};
      getNetworkConfigSuccess({
        config: sortConfig(cleanedOverride),
        topologyName,
      });
    },
  );
};

export const getNodeOverrideConfig = topologyName => {
  // TODO
  // topology.topology.nodes.map(node => node.mac_addr);
  const data = {
    nodes: [],
  };
  apiServiceRequest(topologyName, 'getNodeOverridesConfig', data).then(
    response => {
      const {overrides} = response.data;
      getNodeConfigSuccess({
        config: sortConfig(JSON.parse(overrides)),
        topologyName,
      });
    },
  );
};

export const getControllerConfig = topologyName => {
  apiServiceRequest(topologyName, 'getControllerConfig').then(response => {
    const {config} = response.data;
    const parsedConfig = JSON.parse(config);

    getControllerConfigSuccess({
      config: sortConfigByTag(parsedConfig),
      topologyName,
    });
  });
};

export const getControllerConfigMetadata = topologyName => {
  apiServiceRequest(topologyName, 'getControllerConfigMetadata').then(
    response => {
      const {metadata} = response.data;
      const parsedMetadata = JSON.parse(metadata);

      getControllerConfigMetadataSuccess({
        metadata: parsedMetadata,
        topologyName,
      });
    },
  );
};

export const setNetworkOverrideConfig = (topologyName, config) => {
  const data = {
    overrides: JSON.stringify(config),
  };
  apiServiceRequest(topologyName, 'setNetworkOverridesConfig', data)
    .then(response => {
      setNetworkConfigSuccess({config});
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};

// logic is placed here to uncrowd the NetworkConfigContainer
export const setNodeOverrideConfig = (
  topologyName,
  config,
  nodesWithChanges,
  saveSelected,
  useNameAsKey,
  mac2NameMap,
) => {
  // filter nodes by changes
  let configToSubmit = pick(config, nodesWithChanges);

  // TODO a quick hack to support nameBased config for M19 onwards
  // remove after cleaning code to use node name
  if (useNameAsKey) {
    const nameBased = {};
    Object.keys(configToSubmit).forEach(key => {
      const nodeName = mac2NameMap[key];
      if (nodeName) {
        nameBased[nodeName] = configToSubmit[key];
      }
    });
    configToSubmit = nameBased;
  }

  const data = {
    overrides: JSON.stringify(configToSubmit),
  };
  apiServiceRequest(topologyName, 'setNodeOverridesConfig', data)
    .then(response => {
      setNodeConfigSuccess({config, saveSelected});
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};

export const setControllerConfig = (topologyName, config) => {
  const data = {
    config: JSON.stringify(config),
  };
  apiServiceRequest(topologyName, 'setControllerConfig', data)
    .then(response => {
      setControllerConfigSuccess({config});
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};

export const getAggregatorConfigAndMetadata = topologyName => {
  const configRequest = apiServiceRequest(topologyName, 'getAggregatorConfig');
  const configMetadataRequest = apiServiceRequest(
    topologyName,
    'getAggregatorConfigMetadata',
  );

  Promise.all([configRequest, configMetadataRequest]).then(
    ([configResp, metadataResp]) => {
      const {config} = configResp.data;
      const parsedConfig = JSON.parse(config);

      const {metadata} = metadataResp.data;
      const parsedMetadata = JSON.parse(metadata);

      getAggregatorConfigAndMetadataSuccess({
        config: parsedConfig,
        metadata: parsedMetadata,
        topologyName,
      });
    },
  );
};

export const setAggregatorConfig = (topologyName, config) => {
  const data = {
    config: JSON.stringify(config),
  };

  apiServiceRequest(topologyName, 'setAggregatorConfig', data)
    .then(response => setAggregatorConfigSuccess({config}))
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};
