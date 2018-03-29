// util class for making API calls to the node server for network config
import axios from "axios";
var _ = require("lodash");

import {
  getBaseConfigSuccess,
  getNetworkConfigSuccess,
  getNodeConfigSuccess,
  setNetworkConfigSuccess,
  setNodeConfigSuccess,
  showConfigError
} from "../actions/NetworkConfigActions.js";

import { DEFAULT_BASE_KEY } from "../constants/NetworkConfigConstants.js";
import { sortConfig } from "../helpers/NetworkConfigHelpers.js";

const getErrorText = error => {
  // try to get the status text from the API response, otherwise, default to the error object
  return error.response && error.response.statusText
    ? error.response.statusText
    : error;
};

export const getConfigsForTopology = (
  topologyName,
  imageVersions,
  getNetworkConfig
) => {
  const uri = "/controller/getBaseConfig";

  return axios
    .get(uri, {
      params: {
        topologyName,
        imageVersions: [DEFAULT_BASE_KEY, ...imageVersions]
      }
    })
    .then(response => {
      const { config } = response.data;
      const parsedConfig = JSON.parse(config);
      // assume here that it's a map of base version to config object
      let cleanedConfig = {};
      Object.keys(parsedConfig).forEach(baseVersion => {
        const configValue = _.isPlainObject(parsedConfig[baseVersion])
          ? parsedConfig[baseVersion]
          : {};
        cleanedConfig[baseVersion] = configValue;
      }, {});

      getBaseConfigSuccess({
        config: sortConfig(cleanedConfig),
        topologyName
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

export const getNetworkOverrideConfig = topologyName => {
  const uri = "/controller/getNetworkOverrideConfig";

  axios
    .get(uri, {
      params: {
        topologyName
      }
    })
    .then(response => {
      const { overrides } = response.data;
      const cleanedOverride = _.isPlainObject(JSON.parse(overrides))
        ? JSON.parse(overrides)
        : {};
      getNetworkConfigSuccess({
        config: sortConfig(cleanedOverride),
        topologyName
      });

      getNodeOverrideConfig(topologyName);
    })
    .catch(error => {
      getNodeOverrideConfig(topologyName);
    });
};

export const getNodeOverrideConfig = topologyName => {
  const uri = "/controller/getNodeOverrideConfig";

  axios
    .get(uri, {
      params: {
        topologyName,
        nodes: []
      }
    })
    .then(response => {
      const { overrides } = response.data;
      getNodeConfigSuccess({
        config: sortConfig(JSON.parse(overrides)),
        topologyName
      });
    });
};

export const setNetworkOverrideConfig = (topologyName, config) => {
  const uri = "/controller/setNetworkOverrideConfig";

  axios
    .post(uri, {
      config: config,
      topologyName: topologyName
    })
    .then(response => {
      setNetworkConfigSuccess({ config });
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
  mac2NameMap
) => {
  // filter nodes by changes
  var configToSubmit = _.pick(config, nodesWithChanges);
  const uri = "/controller/setNodeOverrideConfig";

  // TODO a quick hack to support nameBased config for M19 onwards
  // remove after cleaning code to use node name
  if (useNameAsKey) {
    var nameBased = {}
    Object.keys(configToSubmit).forEach(function(key) {
      var nodeName = mac2NameMap[key];
      if (nodeName) {
        nameBased[nodeName] = configToSubmit[key];
      }
    });
    configToSubmit = nameBased;
  }

  axios
    .post(uri, {
      config: configToSubmit,
      topologyName: topologyName
    })
    .then(response => {
      setNodeConfigSuccess({ config, saveSelected });
    })
    .catch(error => {
      const errorText = getErrorText(error);
      showConfigError(errorText);
    });
};
