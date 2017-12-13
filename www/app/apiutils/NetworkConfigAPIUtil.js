// util class for making API calls to the node server for network config
import axios from 'axios';
var _ = require('lodash');

import {
  getBaseConfigSuccess,
  getNetworkConfigSuccess,
  getNodeConfigSuccess,

  setNetworkConfigSuccess,
  setNodeConfigSuccess,
} from '../actions/NetworkConfigActions.js';

import { DEFAULT_BASE_KEY } from '../constants/NetworkConfigConstants.js';
import { sortConfig } from '../helpers/NetworkConfigHelpers.js';

export const getConfigsForTopology = (topologyName, imageVersions, getNetworkConfig) => {
  const uri = '/controller/getBaseConfig';

  return axios.get(uri, {
    params: {
      topologyName,
      imageVersions: [DEFAULT_BASE_KEY, ...imageVersions],
    }
  }).then((response) => {
    const {config} = response.data;
    getBaseConfigSuccess({
      config: sortConfig(JSON.parse(config)),
      topologyName,
    });

    if (getNetworkConfig) {
      getNetworkOverrideConfig(topologyName);
    }
  }).catch((error) => {
    if (getNetworkConfig) {
      getNetworkOverrideConfig(topologyName);
    }
  });
}

export const getNetworkOverrideConfig = (topologyName) => {
  const uri = '/controller/getNetworkOverrideConfig';

  axios.get(uri, {
    params: {
      topologyName,
    }
  }).then((response) => {
    const {overrides} = response.data;
    getNetworkConfigSuccess({
      config: sortConfig(JSON.parse(overrides)),
      topologyName,
    });

    getNodeOverrideConfig(topologyName);
  }).catch((error) => {
    getNodeOverrideConfig(topologyName);
  });
};

export const getNodeOverrideConfig = (topologyName) => {
  const uri = '/controller/getNodeOverrideConfig';

  axios.get(uri, {
    params: {
      topologyName,
      nodes: [],
    }
  }).then((response) => {
    const {overrides} = response.data;
    getNodeConfigSuccess({
      config: sortConfig(JSON.parse(overrides)),
      topologyName,
    });
  });
};

export const setNetworkOverrideConfig = (topologyName, config) => {
  const uri = '/controller/setNetworkOverrideConfig';

  axios.post(uri, {
    config: config,
    topologyName: topologyName,
  }).then((response) => {
    setNetworkConfigSuccess({config});
  });
};

// logic is placed here to uncrowd the NetworkConfigContainer
export const setNodeOverrideConfig = (topologyName, config, nodesWithChanges, saveSelected) => {
  // filter nodes by changes
  const configToSubmit = _.pick(config, nodesWithChanges);
  const uri = '/controller/setNodeOverrideConfig';

  axios.post(uri, {
    config: configToSubmit,
    topologyName: topologyName,
  }).then((response) => {
    setNodeConfigSuccess({config, saveSelected});
  });
};
