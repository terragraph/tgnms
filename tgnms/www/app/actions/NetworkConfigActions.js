/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Dispatcher from '../NetworkDispatcher.js';

export const NetworkConfigActions = {
  // form edit actions
  CHANGE_EDIT_MODE: 'CHANGE_EDIT_MODE',
  EDIT_CONFIG_FORM: 'EDIT_CONFIG_FORM',
  REVERT_CONFIG_OVERRIDE: 'REVERT_CONFIG_OVERRIDE',
  DISCARD_UNSAVED_CONFIG: 'DISCARD_UNSAVED_CONFIG',

  SUBMIT_CONFIG: 'SUBMIT_CONFIG',
  SUBMIT_CONFIG_FOR_ALL_NODES: 'SUBMIT_CONFIG_FOR_ALL_NODES',
  RESET_CONFIG: 'RESET_CONFIG',
  RESET_CONFIG_FOR_ALL_NODES: 'RESET_CONFIG_FOR_ALL_NODES',
  REFRESH_CONFIG: 'REFRESH_CONFIG',

  SELECT_IMAGE: 'SELECT_IMAGE',
  SELECT_HARDWARE_TYPE: 'SELECT_HARDWARE_TYPE',
  SELECT_NODES: 'SELECT_NODES',

  ADD_NEW_FIELD: 'ADD_NEW_FIELD',
  EDIT_NEW_FIELD: 'EDIT_NEW_FIELD',
  DELETE_NEW_FIELD: 'DELETE_NEW_FIELD',
  SUBMIT_NEW_FIELD: 'SUBMIT_NEW_FIELD',

  EDIT_AND_DELETE_FIELDS: 'EDIT_AND_DELETE_FIELDS',
  DELETE_FIELDS: 'DELETE_FIELDS',

  EDIT_E2E_CONFIG_TYPE: 'EDIT_E2E_CONFIG_TYPE',

  // API call resolution actions for get
  GET_BASE_CONFIG_SUCCESS: 'GET_BASE_CONFIG_SUCCESS',
  GET_BASE_CONFIG_FAILED: 'GET_BASE_CONFIG_FAILED',

  GET_HARDWARE_BASE_CONFIG_SUCCESS: 'GET_HARDWARE_BASE_CONFIG_SUCCESS',
  GET_HARDWARE_BASE_CONFIG_FAILED: 'GET_HARDWARE_BASE_CONFIG_FAILED',

  GET_CONFIG_METADATA_SUCCESS: 'GET_CONFIG_METADATA_SUCCESS',
  GET_CONFIG_METADATA_FAILED: 'GET_CONFIG_METADATA_FAILED',

  GET_AUTO_CONFIG_SUCCESS: 'GET_AUTO_CONFIG_SUCCESS',
  GET_AUTO_CONFIG_FAILED: 'GET_AUTO_CONFIG_FAILED',

  GET_NETWORK_CONFIG_SUCCESS: 'GET_NETWORK_CONFIG_SUCCESS',
  GET_NETWORK_CONFIG_FAILED: 'GET_NETWORK_CONFIG_FAILED',

  GET_NODE_CONFIG_SUCCESS: 'GET_NODE_CONFIG_SUCCESS',
  GET_NODE_CONFIG_FAILED: 'GET_NODE_CONFIG_FAILED',

  GET_CONTROLLER_CONFIG_SUCCESS: 'GET_CONTROLLER_CONFIG_SUCCESS',
  GET_CONTROLLER_CONFIG_FAILED: 'GET_CONTROLLER_CONFIG_FAILED',

  GET_CONTROLLER_CONFIG_METADATA_SUCCESS:
    'GET_CONTROLLER_CONFIG_METADATA_SUCCESS',
  GET_CONTROLLER_CONFIG_METADATA_FAILED:
    'GET_CONTROLLER_CONFIG_METADATA_FAILED',

  // API call resolution actions for set
  SET_NETWORK_CONFIG_SUCCESS: 'SET_NETWORK_CONFIG_SUCCESS',
  SET_NETWORK_CONFIG_FAILED: 'SET_NETWORK_CONFIG_FAILED',

  SET_NODE_CONFIG_SUCCESS: 'SET_NODE_CONFIG_SUCCESS',
  SET_NODE_CONFIG_FAILED: 'SET_NODE_CONFIG_FAILED',

  SET_CONTROLLER_CONFIG_SUCCESS: 'SET_CONTROLLER_CONFIG_SUCCESS',
  SET_CONTROLLER_CONFIG_FAILED: 'SET_CONTROLLER_CONFIG_FAILED',

  GET_AGGREGATOR_CONFIG_AND_METADATA_SUCCESS:
    'GET_AGGREGATOR_CONFIG_AND_METADATA_SUCCESS',
  GET_AGGREGATOR_CONFIG_AND_METADATA_FAILED:
    'GET_AGGREGATOR_CONFIG_AND_METADATA_FAILED',

  SET_AGGREGATOR_CONFIG_SUCCESS: 'SET_AGGREGATOR_CONFIG_SUCCESS',
  SET_AGGREGATOR_CONFIG_FAILED: 'SET_AGGREGATOR_CONFIG_FAILED',

  TOGGLE_EXPAND_ALL: 'TOGGLE_EXPAND_ALL',

  SHOW_CONFIG_ERROR: 'SHOW_CONFIG_ERROR',
};

// actions that switch editing context
export const changeEditMode = ({editMode}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.CHANGE_EDIT_MODE,
    editMode,
  });
};

export const selectImage = ({image}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_IMAGE,
    image,
  });
};

export const selectHardwareType = ({hardwareType}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_HARDWARE_TYPE,
    hardwareType,
  });
};

export const selectNodes = ({nodes}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SELECT_NODES,
    nodes,
  });
};

export const changeConfigType = configType => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_E2E_CONFIG_TYPE,
    configType,
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
};

export const discardUnsavedConfig = ({editPath}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.DISCARD_UNSAVED_CONFIG,
    editPath,
  });
};

export const addNewField = ({editPath, type}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.ADD_NEW_FIELD,
    editPath,
    type,
  });
};

export const editNewField = ({editPath, id, field, value}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_NEW_FIELD,
    editPath,
    id,
    field,
    value,
  });
};

export const submitNewField = ({editPath, id}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_NEW_FIELD,
    editPath,
    id,
  });
};

export const deleteNewField = ({editPath, id}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.DELETE_NEW_FIELD,
    editPath,
    id,
  });
};

export const editAndDeleteFields = ({editPath, value, pathsToRemove}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.EDIT_AND_DELETE_FIELDS,
    editPath,
    value,
    pathsToRemove,
  });
};

export const deleteFields = ({editPaths}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.DELETE_FIELDS,
    editPaths,
  });
};

// actions that modify the entire config (no editpath)
export const submitConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_CONFIG,
  });
};

export const submitConfigForAllNodes = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SUBMIT_CONFIG_FOR_ALL_NODES,
  });
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

export const refreshConfig = () => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.REFRESH_CONFIG,
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

export const getHardwareBaseConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_HARDWARE_BASE_CONFIG_SUCCESS,
    topologyName,
    config,
  });
};

export const getConfigMetadataSuccess = ({metadata, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_CONFIG_METADATA_SUCCESS,
    topologyName,
    metadata,
  });
};

export const getAutoConfigSuccess = ({config, topologyName}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_AUTO_CONFIG_SUCCESS,
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

export const getControllerConfigSuccess = ({
  config,
  topologyName,
  peerType,
}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_CONTROLLER_CONFIG_SUCCESS,
    topologyName,
    config,
    peerType,
  });
};

export const getControllerConfigMetadataSuccess = ({
  metadata,
  topologyName,
}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_CONTROLLER_CONFIG_METADATA_SUCCESS,
    topologyName,
    metadata,
  });
};

// API returns when setting an override is successful
export const setNetworkConfigSuccess = ({config}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS,
    config,
  });
};

export const setNodeConfigSuccess = ({config, saveSelected}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_NODE_CONFIG_SUCCESS,
    config,
    saveSelected,
  });
};

export const setControllerConfigSuccess = ({config, peerType}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_CONTROLLER_CONFIG_SUCCESS,
    config,
    peerType,
  });
};

export const getAggregatorConfigAndMetadataSuccess = ({
  config,
  metadata,
  topologyName,
}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.GET_AGGREGATOR_CONFIG_AND_METADATA_SUCCESS,
    topologyName,
    config,
    metadata,
  });
};

export const setAggregatorConfigSuccess = ({config}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SET_AGGREGATOR_CONFIG_SUCCESS,
    config,
  });
};

export const showConfigError = errorText => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.SHOW_CONFIG_ERROR,
    errorText,
  });
};

export const toggleExpandAll = ({isExpanded}) => {
  Dispatcher.dispatch({
    actionType: NetworkConfigActions.TOGGLE_EXPAND_ALL,
    isExpanded,
  });
};
