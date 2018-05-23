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
  setControllerConfigSuccess,
  setNetworkConfigSuccess,
  setNodeConfigSuccess,
  showConfigError,
} from '../actions/NetworkConfigActions.js';
import {DEFAULT_BASE_KEY} from '../constants/NetworkConfigConstants.js';
import {sortConfig} from '../helpers/NetworkConfigHelpers.js';
import axios from 'axios';
import isPlainObject from 'lodash-es/isPlainObject';
import pick from 'lodash-es/pick';

const getErrorText = error => {
  // try to get the status text from the API response, otherwise, default to the error object
  return error.response && error.response.statusText
    ? error.response.statusText
    : error;
};

export const getConfigsForTopology = (
  topologyName,
  imageVersions,
  getNetworkConfig,
) => {
  const uri = '/controller/getBaseConfig';

  return axios
    .get(uri, {
      params: {
        topologyName,
        imageVersions: [DEFAULT_BASE_KEY, ...imageVersions],
      },
    })
    .then(response => {
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

      if (getNetworkConfig) {
        getNetworkOverrideConfig(topologyName);
      }
    })
    .catch(error => {
      if (getNetworkConfig) {
        getNetworkOverrideConfig(topologyName);
      }
    });
};

export const getConfigMetadata = topologyName => {
  const uri = '/controller/getConfigMetadata';

  axios
    .get(uri, {
      params: {
        topologyName,
      },
    })
    .then(response => {
      const {metadata} = response.data;
      const parsedMetadata = JSON.parse(metadata);

      getConfigMetadataSuccess({
        metadata: parsedMetadata,
        topologyName,
      });
    });
};

export const getNetworkOverrideConfig = topologyName => {
  const uri = '/controller/getNetworkOverrideConfig';

  axios
    .get(uri, {
      params: {
        topologyName,
      },
    })
    .then(response => {
      const {overrides} = response.data;
      const cleanedOverride = isPlainObject(JSON.parse(overrides))
        ? JSON.parse(overrides)
        : {};
      getNetworkConfigSuccess({
        config: sortConfig(cleanedOverride),
        topologyName,
      });

      getNodeOverrideConfig(topologyName);
    })
    .catch(error => {
      getNodeOverrideConfig(topologyName);
    });
};

export const getNodeOverrideConfig = topologyName => {
  const uri = '/controller/getNodeOverrideConfig';

  axios
    .get(uri, {
      params: {
        topologyName,
        nodes: [],
      },
    })
    .then(response => {
      const {overrides} = response.data;
      getNodeConfigSuccess({
        config: sortConfig(JSON.parse(overrides)),
        topologyName,
      });
    });
};

export const getControllerConfig = topologyName => {
  const uri = '/controller/getControllerConfig';

  axios
    .get(uri, {
      params: {
        topologyName,
      },
    })
    .then(response => {
      const {config} = response.data;
      const parsedConfig = JSON.parse(config);

      getControllerConfigSuccess({
        config: sortConfig(parsedConfig),
        topologyName,
      });
    });
};

export const getControllerConfigMetadata = topologyName => {
  const uri = '/controller/getControllerConfigMetadata';

  axios
    .get(uri, {
      params: {
        topologyName,
      },
    })
    .then(response => {
      const {metadata} = response.data;
      const parsedMetadata = JSON.parse(metadata);

      getControllerConfigMetadataSuccess({
        metadata: parsedMetadata,
        topologyName,
      });
    });
};

export const setNetworkOverrideConfig = (topologyName, config) => {
  const uri = '/controller/setNetworkOverrideConfig';

  axios
    .post(uri, {
      config,
      topologyName,
    })
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
  const uri = '/controller/setNodeOverrideConfig';

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

  axios
    .post(uri, {
      config: configToSubmit,
      topologyName,
    })
    .then(response => {
      setNodeConfigSuccess({config, saveSelected});
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};

export const setControllerConfig = (topologyName, config) => {
  const uri = '/controller/setControllerConfig';

  axios
    .post(uri, {
      config,
      topologyName,
    })
    .then(response => {
      setControllerConfigSuccess({config});
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};
