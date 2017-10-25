import Dispatcher from '../NetworkDispatcher.js';

export const NetworkConfigActions = {
  // form edit actions
  CHANGE_EDIT_MODE: 'CHANGE_EDIT_MODE',
  EDIT_CONFIG_FORM: 'EDIT_CONFIG_FORM',
  SAVE_DRAFT_CONFIG: 'SAVE_DRAFT_CONFIG',
  SUBMIT_CONFIG: 'SUBMIT_CONFIG',

  // API call resolution actions
  BASE_CONFIG_LOAD_SUCCESS: 'BASE_CONFIG_LOAD_SUCCESS',
  BASE_CONFIG_LOAD_FAILED: 'BASE_CONFIG_LOAD_FAILED',

  NETWORK_CONFIG_LOAD_SUCCESS: 'NETWORK_CONFIG_LOAD_SUCCESS',
  NETWORK_CONFIG_LOAD_FAILED: 'NETWORK_CONFIG_LOAD_FAILED',

  NODE_CONFIG_LOAD_SUCCESS: 'NODE_CONFIG_LOAD_SUCCESS',
  NODE_CONFIG_LOAD_FAILED: 'NODE_CONFIG_LOAD_FAILED',
};

export const editConfigForm = ({editPath, value}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_CONFIG_FORM,
    editPath,
    value
  })
};

export const loadBaseConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.BASE_CONFIG_LOAD_SUCCESS,
    topologyName,
    config,
  });
};

export const loadNetworkConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.NETWORK_CONFIG_LOAD_SUCCESS,
    topologyName,
    config: config
  });
};

export const loadNodeConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.NODE_CONFIG_LOAD_SUCCESS,
    topologyName,
    config: config
  });
};
