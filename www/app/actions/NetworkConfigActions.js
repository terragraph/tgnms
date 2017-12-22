import Dispatcher from "../NetworkDispatcher.js";

export const NetworkConfigActions = {
  // form edit actions
  CHANGE_EDIT_MODE: "CHANGE_EDIT_MODE",
  EDIT_CONFIG_FORM: "EDIT_CONFIG_FORM",
  REVERT_CONFIG_OVERRIDE: "REVERT_CONFIG_OVERRIDE",
  DISCARD_UNSAVED_CONFIG: "DISCARD_UNSAVED_CONFIG",

  SUBMIT_CONFIG: "SUBMIT_CONFIG",
  SUBMIT_CONFIG_FOR_ALL_NODES: "SUBMIT_CONFIG_FOR_ALL_NODES",
  RESET_CONFIG: "RESET_CONFIG",
  RESET_CONFIG_FOR_ALL_NODES: "RESET_CONFIG_FOR_ALL_NODES",
  REFRESH_CONFIG: "REFRESH_CONFIG",

  SELECT_IMAGE: "SELECT_IMAGE",
  SELECT_NODES: "SELECT_NODES",

  ADD_NEW_FIELD: "ADD_NEW_FIELD",
  EDIT_NEW_FIELD: "EDIT_NEW_FIELD",
  DELETE_NEW_FIELD: "DELETE_NEW_FIELD",
  SUBMIT_NEW_FIELD: "SUBMIT_NEW_FIELD",

  // API call resolution actions for get
  GET_BASE_CONFIG_SUCCESS: "GET_BASE_CONFIG_SUCCESS",
  GET_BASE_CONFIG_FAILED: "GET_BASE_CONFIG_FAILED",

  GET_NETWORK_CONFIG_SUCCESS: "GET_NETWORK_CONFIG_SUCCESS",
  GET_NETWORK_CONFIG_FAILED: "GET_NETWORK_CONFIG_FAILED",

  GET_NODE_CONFIG_SUCCESS: "GET_NODE_CONFIG_SUCCESS",
  GET_NODE_CONFIG_FAILED: "GET_NODE_CONFIG_FAILED",

  // API call resolution actions for set
  SET_NETWORK_CONFIG_SUCCESS: "SET_NETWORK_CONFIG_SUCCESS",
  SET_NETWORK_CONFIG_FAILED: "SET_NETWORK_CONFIG_FAILED",

  SET_NODE_CONFIG_SUCCESS: "SET_NODE_CONFIG_SUCCESS",
  SET_NODE_CONFIG_FAILED: "SET_NODE_CONFIG_FAILED",

  TOGGLE_EXPAND_ALL: "TOGGLE_EXPAND_ALL"
};

// actions that switch editing context
export const changeEditMode = ({ editMode }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.CHANGE_EDIT_MODE,
    editMode
  });
};

export const selectImage = ({ image }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_IMAGE,
    image
  });
};

export const selectNodes = ({ nodes }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_NODES,
    nodes
  });
};

// actions that edit the config itself
export const editConfigForm = ({ editPath, value }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_CONFIG_FORM,
    editPath,
    value
  });
};

export const revertConfigOverride = ({ editPath }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.REVERT_CONFIG_OVERRIDE,
    editPath
  });
};

export const discardUnsavedConfig = ({ editPath }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.DISCARD_UNSAVED_CONFIG,
    editPath
  });
};

export const addNewField = ({ editPath, type }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.ADD_NEW_FIELD,
    editPath,
    type
  });
};

export const editNewField = ({ editPath, id, field, value }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_NEW_FIELD,
    editPath,
    id,
    field,
    value
  });
};

export const submitNewField = ({ editPath, id }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_NEW_FIELD,
    editPath,
    id
  });
};

export const deleteNewField = ({ editPath, id }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.DELETE_NEW_FIELD,
    editPath,
    id
  });
};

// actions that modify the entire config (no editpath)
export const submitConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_CONFIG
  });
};

export const submitConfigForAllNodes = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_CONFIG_FOR_ALL_NODES
  });
};

export const resetConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.RESET_CONFIG
  });
};

export const resetConfigForAllNodes = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.RESET_CONFIG_FOR_ALL_NODES
  });
};

export const refreshConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.REFRESH_CONFIG
  });
};

// actions sent from the API handler once API returns
export const getBaseConfigSuccess = ({ config, topologyName }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_BASE_CONFIG_SUCCESS,
    topologyName,
    config
  });
};

export const getNetworkConfigSuccess = ({ config, topologyName }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_NETWORK_CONFIG_SUCCESS,
    topologyName,
    config
  });
};

export const getNodeConfigSuccess = ({ config, topologyName }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_NODE_CONFIG_SUCCESS,
    topologyName,
    config
  });
};

// API returns when setting an override is successful
export const setNetworkConfigSuccess = ({ config }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS,
    config
  });
};

export const setNodeConfigSuccess = ({ config, saveSelected }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NODE_CONFIG_SUCCESS,
    config,
    saveSelected
  });
};

export const toggleExpandAll = ({ isExpanded }) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.TOGGLE_EXPAND_ALL,
    isExpanded
  });
};
