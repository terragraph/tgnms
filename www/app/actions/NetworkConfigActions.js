import Dispatcher from '../NetworkDispatcher.js';

export const NetworkConfigActions = {
  // form edit actions
  CHANGE_EDIT_MODE: 'CHANGE_EDIT_MODE',
  EDIT_CONFIG_FORM: 'EDIT_CONFIG_FORM',
  SAVE_DRAFT_CONFIG: 'SAVE_DRAFT_CONFIG',
  SUBMIT_CONFIG: 'SUBMIT_CONFIG',
  RESET_CONFIG: 'RESET_CONFIG',
  RESET_CONFIG_FOR_ALL_NODES: 'RESET_CONFIG_FOR_ALL_NODES',

  SELECT_NODES: 'SELECT_NODES',

  // API call resolution actions for get
  GET_BASE_CONFIG_SUCCESS: 'GET_BASE_CONFIG_SUCCESS',
  GET_BASE_CONFIG_FAILED: 'GET_BASE_CONFIG_FAILED',

  GET_NETWORK_CONFIG_SUCCESS: 'GET_NETWORK_CONFIG_SUCCESS',
  GET_NETWORK_CONFIG_FAILED: 'GET_NETWORK_CONFIG_FAILED',

  GET_NODE_CONFIG_SUCCESS: 'GET_NODE_CONFIG_SUCCESS',
  GET_NODE_CONFIG_FAILED: 'GET_NODE_CONFIG_FAILED',

  // API call resolution actions for set
  SET_NETWORK_CONFIG_SUCCESS: 'SET_NETWORK_CONFIG_SUCCESS',
  SET_NETWORK_CONFIG_FAILED: 'SET_NETWORK_CONFIG_FAILED',

  SET_NODE_CONFIG_SUCCESS: 'SET_NODE_CONFIG_SUCCESS',
  SET_NODE_CONFIG_FAILED: 'SET_NODE_CONFIG_FAILED',
};

export const changeEditMode = ({editMode}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.CHANGE_EDIT_MODE,
    editMode,
  })
};

export const editConfigForm = ({editPath, value}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_CONFIG_FORM,
    editPath,
    value,
  })
};

export const resetConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.RESET_CONFIG,
  });
};

export const resetConfigForAllNodes = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.RESET_CONFIG_FOR_ALL_NODES,
  });
};

export const submitConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_CONFIG,
  });
};

export const selectNodes = ({nodes}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_NODES,
    nodes,
  })
};

// actions sent from the API handler once API returns

export const getBaseConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_BASE_CONFIG_SUCCESS,
    topologyName,
    config,
  });
};

export const getNetworkConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_NETWORK_CONFIG_SUCCESS,
    topologyName,
    config,
  });
};

export const getNodeConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_NODE_CONFIG_SUCCESS,
    topologyName,
    config,
  });
};

// set
export const setNetworkConfigSuccess = ({config}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS,
    config,
  });
};

export const setNodeConfigSuccess = ({config}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NODE_CONFIG_SUCCESS,
    config,
  });
};
