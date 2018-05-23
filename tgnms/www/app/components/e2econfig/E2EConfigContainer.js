/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// E2EConfigContainer.js
// a container for ControllerConfig.js and AggregatorConfig.js that acts as a store (stores state) and action dispatch handler

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {NetworkConfigActions} from '../../actions/NetworkConfigActions.js';
import {
  getControllerConfig,
  getControllerConfigMetadata,
  setControllerConfig,
} from '../../apiutils/NetworkConfigAPIUtil.js';
import {Actions} from '../../constants/NetworkConstants.js';
import {
  unsetAndCleanup,
  getDefaultValueForType,
  sortConfig,
} from '../../helpers/NetworkConfigHelpers.js';
import E2EConfig from './E2EConfig.js'
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import merge from 'lodash-es/merge';
import hasIn from 'lodash-es/hasIn';
import PropTypes from 'prop-types';
import React from 'react';
import SweetAlert from 'sweetalert-react';
import uuidv4 from 'uuid/v4';

export default class E2EConfigContainer extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent);
  }

  state = {
    controllerConfig: {},
    controllerConfigMetadata: {},

    newConfigFields: {},
    draftConfig: {},

    errorMsg: null,
  };

  componentDidMount() {
    const topologyName = this.props.networkConfig.topology.name;
    this.fetchConfigsForCurrentTopology(topologyName);
  }

  componentDidUpdate(prevProps) {
    const oldTopologyName = prevProps.networkConfig.topology.name;
    const newTopologyName = this.props.networkConfig.topology.name;

    const isNextTopologyValid = hasIn(this.props.networkConfig, [
      'topology',
      'name',
    ]);

    if (isNextTopologyValid && newTopologyName !== oldTopologyName) {
      this.fetchConfigsForCurrentTopology(newTopologyName);

      this.setState({
        newConfigFields: {},
        draftConfig: {},
      });
    }
  }

  componentWillUnmount() {
    Dispatcher.unregister(this.dispatchToken);
  }

  fetchConfigsForCurrentTopology(topologyName) {
    getControllerConfig(topologyName);
    getControllerConfigMetadata(topologyName);
  }

  handleDispatchEvent = (payload) => {
    switch (payload.actionType) {
      // actions returned by API requests
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_SUCCESS:
        const {config} = payload;
        const cleanedConfigFlags = {};

        // Strip the token before the dot for backwards compatibility
        Object.keys(config.flags).forEach((flagField) => {
          const tokensByDot = flagField.split('.');

          if (tokensByDot.length === 2) {
            // Format 'x.x', take the second token
            cleanedConfigFlags[tokensByDot[1]] = config.flags[flagField];
          } else {
            cleanedConfigFlags[flagField] = config.flags[flagField];
          }
        });

        config.flags = cleanedConfigFlags

        this.setState({
          controllerConfig: sortConfig(config),
        });
        break;
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_METADATA_SUCCESS:
      const {metadata} = payload;
        this.setState({
          controllerConfig: sortConfig(this.state.controllerConfig, metadata),
          draftConfig: sortConfig(this.state.draftConfig, metadata),
          controllerConfigMetadata: metadata,
        });
        break;
      case NetworkConfigActions.SET_CONTROLLER_CONFIG_SUCCESS:
        this.setState({
          controllerConfig: sortConfig({...payload.config}, this.state.controllerConfigMetadata),
          draftConfig: {},
          newConfigFields: {},
        })
        break;
      case NetworkConfigActions.SHOW_CONFIG_ERROR:
        this.setState({
          errorMsg: payload.errorText,
        });
        break;

      // actions that change individual fields
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        this.editConfig(payload.editPath, payload.value);
        break;
      case NetworkConfigActions.DISCARD_UNSAVED_CONFIG:
        this.undoRevertConfig(payload.editPath);
        break;
      case NetworkConfigActions.ADD_NEW_FIELD:
        this.addNewField(payload.editPath, payload.type);
        break;
      case NetworkConfigActions.EDIT_NEW_FIELD:
        this.editNewField(
          payload.editPath,
          payload.id,
          payload.field,
          payload.value,
        );
        break;
      case NetworkConfigActions.DELETE_NEW_FIELD:
        this.deleteNewField(payload.editPath, payload.id);
        break;

      // actions that change the ENTIRE FORM
      case NetworkConfigActions.SUBMIT_CONFIG:
        setControllerConfig(
          this.props.networkConfig.topology.name,
          merge(this.state.controllerConfig, this.state.draftConfig),
        );
        break;
      case NetworkConfigActions.RESET_CONFIG:
        this.resetConfig();
        break;
      default:
        break;
    }
  }

  addNewField(editPath, type) {
    const newId = uuidv4();
    const newField = {
      id: newId,
      type: type,
      field: '',
      value: getDefaultValueForType(type),
    };

    this.setState({
      newConfigFields: this.editConfigHelper(
        this.state.newConfigFields,
        [...editPath, newId],
        newField,
      ),
    });
  }

  editNewField(editPath, id, field, value) {
    const newField = {
      ...this.getConfig(this.state.newConfigFields, [...editPath, id]),
      field,
      value,
    };

    this.setState({
      newConfigFields: this.editConfigHelper(
        this.state.newConfigFields,
        [...editPath, id],
        newField,
      ),
    });
  }

  deleteNewField(editPath, id) {
    this.setState({
      newConfigFields: unsetAndCleanup(
        this.state.newConfigFields,
        [...editPath, id],
        -1,
      ),
    });
  }

  getConfig(config, editPath) {
    return get(config, editPath);
  }

  editConfigHelper(config, editPath, value) {
    return set(config, editPath, value);
  }

  editConfig(editPath, value) {
    this.setState({
      draftConfig: this.editConfigHelper(
        {...this.state.draftConfig},
        editPath,
        value,
      ),
    });
  }

  undoRevertConfig(editPath) {
    this.setState({
      draftConfig: unsetAndCleanup(
        this.state.draftConfig,
        editPath,
        0,
      ),
    });
  }

  resetConfig() {
    this.setState({
      draftConfig: {},
      newConfigFields: {},
    });
  }

  render() {
    const {controllerConfig, controllerConfigMetadata, draftConfig, newConfigFields, errorMsg} = this.state;

    return (
      <div>
        <E2EConfig
          config={controllerConfig}
          configMetadata={controllerConfigMetadata}
          draftConfig={draftConfig}
          newConfigFields={newConfigFields}
        />
        <SweetAlert
          type="error"
          show={Boolean(errorMsg)}
          title="Error"
          text={errorMsg}
          onConfirm={() => this.setState({errorMsg: null})}
        />
      </div>
    )
  }
}
