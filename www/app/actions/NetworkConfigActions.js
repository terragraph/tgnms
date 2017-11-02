import Dispatcher from '../NetworkDispatcher.js';

export const NetworkConfigActions = {
  // form edit actions
  CHANGE_EDIT_MODE: 'CHANGE_EDIT_MODE',
  EDIT_CONFIG_FORM: 'EDIT_CONFIG_FORM',
  REVERT_CONFIG_OVERRIDE: 'REVERT_CONFIG_OVERRIDE',
  UNDO_REVERT_CONFIG: 'UNDO_REVERT_CONFIG',

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

// actions that switch editing context
export const changeEditMode = ({editMode}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.CHANGE_EDIT_MODE,
    editMode,
  });
};

export const selectNodes = ({nodes}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_NODES,
    nodes,
  });
};

// actions that edit the config itself
export const editConfigForm = ({editPath, value}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_CONFIG_FORM,
    editPath,
    value,
  });
};

export const revertConfigOverride = ({editPath}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.REVERT_CONFIG_OVERRIDE,
    editPath,
  });
}

export const undoRevertConfig = ({editPath}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.UNDO_REVERT_CONFIG,
    editPath,
  });
}

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
