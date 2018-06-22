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
  getAggregatorConfigAndMetadata,
  setControllerConfig,
  setAggregatorConfig,
} from '../../apiutils/NetworkConfigAPIUtil.js';
import {Actions, E2EConstants} from '../../constants/NetworkConstants.js';
import {
  unsetAndCleanup,
  getDefaultValueForType,
  sortConfigByTag,
} from '../../helpers/NetworkConfigHelpers.js';
import E2EConfig from './E2EConfig.js';
import {get, set, merge, hasIn, omit} from 'lodash-es';
import PropTypes from 'prop-types';
import React from 'react';
import SweetAlert from 'sweetalert-react';
import uuidv4 from 'uuid/v4';

export default class E2EConfigContainer extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent);

    this.initalState = {
      controllerConfig: {}, // Backup on revert (for deleted fields)
      controllerConfigDirty: false, // Tells us whether controllerConfig === changedControllerConfig
      changedControllerConfig: {},
      controllerConfigMetadata: {},

      aggregatorConfig: {}, // Backup on revert (for deleted fields)
      aggregatorConfigDirty: false, // Tells us whether aggregatorConfig === changedAggregatorConfig
      changedAggregatorConfig: {},
      aggregatorConfigMetadata: {},

      activeConfig: E2EConstants.Controller, // or E2EConstants.Aggregator

      newControllerConfigFields: {},
      draftControllerConfig: {},

      newAggregatorConfigFields: {},
      draftAggregatorConfig: {},

      errorMsg: null,
    };

    this.state = {...this.initalState};
  }

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

      this.setState({...this.initialState});
    }
  }

  componentWillUnmount() {
    Dispatcher.unregister(this.dispatchToken);
  }

  fetchConfigsForCurrentTopology(topologyName) {
    getControllerConfig(topologyName);
    getControllerConfigMetadata(topologyName);
    getAggregatorConfigAndMetadata(topologyName);
  }

  handleDispatchEvent = payload => {
    switch (payload.actionType) {
      // actions returned by API requests
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_SUCCESS: {
        const {config} = payload;
        const cleanedConfigFlags = {};

        // Strip the token before the dot for backwards compatibility
        Object.keys(config.flags).forEach(flagField => {
          const tokensByDot = flagField.split('.');

          if (tokensByDot.length === 2) {
            // Format 'x.x', take the second token
            cleanedConfigFlags[tokensByDot[1]] = config.flags[flagField];
          } else {
            cleanedConfigFlags[flagField] = config.flags[flagField];
          }
        });

        config.flags = cleanedConfigFlags;

        const sortedConfig = sortConfigByTag(config);

        this.setState({
          controllerConfig: sortedConfig,
          changedControllerConfig: sortedConfig,
        });
        break;
      }
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_METADATA_SUCCESS: {
        const {metadata} = payload;

        this.setState({
          controllerConfig: sortConfigByTag(
            this.state.controllerConfig,
            metadata,
          ),
          changedControllerConfig: sortConfigByTag(
            this.state.changedControllerConfig,
            metadata,
          ),
          draftControllerConfig: sortConfigByTag(
            this.state.draftControllerConfig,
            metadata,
          ),
          controllerConfigMetadata: metadata,
        });
        break;
      }
      case NetworkConfigActions.SET_CONTROLLER_CONFIG_SUCCESS: {
        const {config} = payload;
        const sortedConfig = sortConfigByTag(
          {...config},
          this.state.controllerConfigMetadata,
        );

        this.setState({
          controllerConfig: sortedConfig,
          changedControllerConfig: sortedConfig,
          controllerConfigDirty: false,
          draftControllerConfig: {},
          newControllerConfigFields: {},
        });
        break;
      }
      case NetworkConfigActions.GET_AGGREGATOR_CONFIG_AND_METADATA_SUCCESS: {
        const {config, metadata} = payload;
        const sortedConfig = sortConfigByTag(config, metadata);

        this.setState({
          aggregatorConfig: sortedConfig,
          changedAggregatorConfig: sortedConfig,
          aggregatorConfigMetadata: metadata,
        });
        break;
      }
      case NetworkConfigActions.SET_AGGREGATOR_CONFIG_SUCCESS: {
        const {config} = payload;
        const sortedConfig = sortConfigByTag(
          {...config},
          this.state.aggregatorConfigMetadata,
        );

        this.setState({
          aggregatorConfig: sortedConfig,
          changedAggregatorConfig: sortedConfig,
          aggregatorConfigDirty: false,
          draftAggregatorConfig: {},
          newAggregatorConfigFields: {},
        });
        break;
      }
      case NetworkConfigActions.SHOW_CONFIG_ERROR:
        this.setState({
          errorMsg: payload.errorText,
        });
        break;

      // actions that change individual fields
      case NetworkConfigActions.EDIT_E2E_CONFIG_TYPE:
        this.setState({
          activeConfig: payload.configType,
        });
        break;
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
      case NetworkConfigActions.DELETE_FIELDS:
        this.deleteFields(payload.editPaths);
        break;
      case NetworkConfigActions.EDIT_AND_DELETE_FIELDS:
        this.editConfig(payload.editPath, payload.value);
        this.deleteFields(payload.pathsToRemove);
        break;

      // actions that change the ENTIRE FORM
      case NetworkConfigActions.SUBMIT_CONFIG:
        if (this.state.activeConfig === E2EConstants.Controller) {
          setControllerConfig(
            this.props.networkConfig.topology.name,
            merge(
              this.state.changedControllerConfig,
              this.state.draftControllerConfig,
            ),
          );
        } else {
          setAggregatorConfig(
            this.props.networkConfig.topology.name,
            merge(
              this.state.changedAggregatorConfig,
              this.state.draftAggregatorConfig,
            ),
          );
        }
        break;
      case NetworkConfigActions.RESET_CONFIG:
        this.resetConfig();
        break;
      default:
        break;
    }
  };

  getChangedConfigKey = () => {
    return this.state.activeConfig === E2EConstants.Controller
      ? 'changedControllerConfig'
      : 'changedAggregatorConfig';
  };

  getConfigDirtyKey = () => {
    return this.state.activeConfig === E2EConstants.Controller
      ? 'controllerConfigDirty'
      : 'aggregatorConfigDirty';
  };

  getNewConfigFieldsKey = () => {
    return this.state.activeConfig === E2EConstants.Controller
      ? 'newControllerConfigFields'
      : 'newAggregatorConfigFields';
  };

  getDraftConfigKey = () => {
    return this.state.activeConfig === E2EConstants.Controller
      ? 'draftControllerConfig'
      : 'draftAggregatorConfig';
  };

  addNewField(editPath, type) {
    const newId = uuidv4();
    const newField = {
      id: newId,
      type,
      field: '',
      value: getDefaultValueForType(type),
    };

    const newConfigFieldsKey = this.getNewConfigFieldsKey();

    this.setState({
      [newConfigFieldsKey]: this.editConfigHelper(
        this.state[newConfigFieldsKey],
        [...editPath, newId],
        newField,
      ),
    });
  }

  editNewField(editPath, id, field, value) {
    const newConfigFieldsKey = this.getNewConfigFieldsKey();
    const newField = {
      ...this.getConfig(this.state[newConfigFieldsKey], [...editPath, id]),
      field,
      value,
    };

    this.setState({
      [newConfigFieldsKey]: this.editConfigHelper(
        this.state[newConfigFieldsKey],
        [...editPath, id],
        newField,
      ),
    });
  }

  deleteNewField(editPath, id) {
    const newConfigFieldsKey = this.getNewConfigFieldsKey();
    this.setState({
      [newConfigFieldsKey]: unsetAndCleanup(
        this.state[newConfigFieldsKey],
        [...editPath, id],
        -1,
      ),
    });
  }

  deleteFields(editPaths) {
    const changedConfigKey = this.getChangedConfigKey();
    const configToChange = this.state[changedConfigKey];

    this.setState({
      [changedConfigKey]: omit(configToChange, editPaths),
      [this.getConfigDirtyKey()]: true,
    });
  }

  getConfig(config, editPath) {
    return get(config, editPath);
  }

  editConfigHelper(config, editPath, value) {
    return editPath !== undefined && editPath !== null
      ? set(config, editPath, value)
      : value;
  }

  editConfig(editPath, value) {
    const draftConfigKey = this.getDraftConfigKey();

    this.setState({
      [draftConfigKey]: this.editConfigHelper(
        {...this.state[draftConfigKey]},
        editPath,
        value,
      ),
    });
  }

  undoRevertConfig(editPath) {
    const draftConfigKey = this.getDraftConfigKey();

    this.setState({
      [draftConfigKey]: unsetAndCleanup(
        this.state[draftConfigKey],
        editPath,
        0,
      ),
    });
  }

  resetConfig() {
    let configToReset;

    if (this.state.activeConfig === E2EConstants.Controller) {
      configToReset = this.state.controllerConfig;
    } else {
      configToReset = this.state.aggregatorConfig;
    }

    this.setState({
      [this.getChangedConfigKey()]: configToReset,
      [this.getConfigDirtyKey()]: false,
      [this.getDraftConfigKey()]: {},
      [this.getNewConfigFieldsKey()]: {},
    });
  }

  render() {
    const {
      activeConfig,
      changedControllerConfig,
      controllerConfigDirty,
      controllerConfigMetadata,
      changedAggregatorConfig,
      aggregatorConfigDirty,
      aggregatorConfigMetadata,
      draftControllerConfig,
      newControllerConfigFields,
      draftAggregatorConfig,
      newAggregatorConfigFields,
      errorMsg,
    } = this.state;

    const e2eConfigProps =
      activeConfig === E2EConstants.Controller
        ? {
            config: changedControllerConfig,
            configMetadata: controllerConfigMetadata,
            configDirty: controllerConfigDirty,
            draftConfig: draftControllerConfig,
            newConfigFields: newControllerConfigFields,
          }
        : {
            config: changedAggregatorConfig,
            configMetadata: aggregatorConfigMetadata,
            configDirty: aggregatorConfigDirty,
            draftConfig: draftAggregatorConfig,
            newConfigFields: newAggregatorConfigFields,
          };

    return (
      <div>
        <E2EConfig
          topologyName={this.props.networkConfig.topology.name}
          activeConfig={activeConfig}
          {...e2eConfigProps}
        />
        <SweetAlert
          type="error"
          show={Boolean(errorMsg)}
          title="Error"
          text={errorMsg}
          onConfirm={() => this.setState({errorMsg: null})}
        />
      </div>
    );
  }
}
