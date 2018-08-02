/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

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
import {
  Actions,
  E2E,
  ControllerPeerType,
} from '../../constants/NetworkConstants.js';
import {
  unsetAndCleanup,
  getDefaultValueForType,
  sortConfigByTag,
} from '../../helpers/NetworkConfigHelpers.js';
import E2EConfigBody from './E2EConfigBody.js';
import {cloneDeep, get, setWith, merge, hasIn, omit} from 'lodash-es';
import PropTypes from 'prop-types';
import React from 'react';
import SweetAlert from 'sweetalert-react';
import uuidv4 from 'uuid/v4';

const initialConfigData = {
  config: {}, // Backup on revert (for deleted fields)
  configDirty: false, // Tells us whether config === changedConfig
  changedConfig: {},
  newConfigFields: {},
  draftConfig: {},
};

export default class E2EConfigContainer extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent);

    this.initialState = {
      activeConfig: E2E.PrimaryController,

      controllerConfigMetadata: {},
      aggregatorConfigMetadata: {},

      primary: cloneDeep(initialConfigData),
      backup: cloneDeep(initialConfigData),
      aggregator: cloneDeep(initialConfigData),

      errorMsg: null,
    };

    this.state = cloneDeep(this.initialState);
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
      this.setState(cloneDeep(this.initialState));
    }
  }

  componentWillUnmount() {
    Dispatcher.unregister(this.dispatchToken);
  }

  fetchConfigsForCurrentTopology(topologyName) {
    getControllerConfig(topologyName, ControllerPeerType.Primary);
    getControllerConfig(topologyName, ControllerPeerType.Backup);
    getControllerConfigMetadata(topologyName);
    getAggregatorConfigAndMetadata(topologyName);
  }

  handleDispatchEvent = payload => {
    switch (payload.actionType) {
      // actions returned by API requests
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_SUCCESS: {
        const {config, peerType} = payload;
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
          [peerType]: {
            ...this.state[peerType],
            config: sortedConfig,
            changedConfig: sortedConfig,
          },
        });

        break;
      }
      case NetworkConfigActions.GET_CONTROLLER_CONFIG_METADATA_SUCCESS: {
        const {metadata} = payload;
        const newPartialState = {};

        // Sort both the primary abd backup controller configs
        Object.values(ControllerPeerType).forEach(type => {
          const configData = this.state[type];
          newPartialState[type] = {
            ...configData,
            config: sortConfigByTag(configData.config, metadata),
            changedConfig: sortConfigByTag(configData.changedConfig, metadata),
            draftConfig: sortConfigByTag(configData.draftConfig, metadata),
          };
        });

        this.setState({
          ...newPartialState,
          controllerConfigMetadata: metadata,
        });
        break;
      }
      case NetworkConfigActions.SET_CONTROLLER_CONFIG_SUCCESS: {
        const {config, peerType} = payload;
        const sortedConfig = sortConfigByTag(
          {...config},
          this.state.controllerConfigMetadata,
        );

        this.setState({
          [peerType]: {
            ...this.state[peerType],
            config: sortedConfig,
            changedConfig: sortedConfig,
            configDirty: false,
            draftConfig: {},
            newConfigFields: {},
          },
        });

        break;
      }
      case NetworkConfigActions.GET_AGGREGATOR_CONFIG_AND_METADATA_SUCCESS: {
        const {config, metadata} = payload;
        const sortedConfig = sortConfigByTag(config, metadata);

        this.setState({
          aggregator: {
            ...this.state.aggregator,
            config: sortedConfig,
            changedConfig: sortedConfig,
          },
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
          aggregator: {
            ...this.state.aggregator,
            config: sortedConfig,
            changedConfig: sortedConfig,
            configDirty: false,
            draftConfig: {},
            newConfigFields: {},
          },
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
      case NetworkConfigActions.SUBMIT_CONFIG: {
        const {activeConfig} = this.state;
        const configTypeKey = this.getConfigTypeKey(activeConfig);
        const configData = this.state[configTypeKey];

        if (
          activeConfig === E2E.PrimaryController ||
          activeConfig === E2E.BackupController
        ) {
          setControllerConfig(
            this.props.networkConfig.topology.name,
            merge(configData.changedConfig, configData.draftConfig),
            activeConfig === E2E.PrimaryController
              ? ControllerPeerType.Primary
              : ControllerPeerType.Backup,
          );
        } else {
          setAggregatorConfig(
            this.props.networkConfig.topology.name,
            merge(configData.changedConfig, configData.draftConfig),
          );
        }
        break;
      }
      case NetworkConfigActions.RESET_CONFIG:
        this.resetConfig();
        break;
      default:
        break;
    }
  };

  getConfigTypeKey = activeConfig => {
    switch (activeConfig) {
      case E2E.PrimaryController:
        return ControllerPeerType.Primary;
      case E2E.BackupController:
        return ControllerPeerType.Backup;
      case E2E.Aggregator:
        return 'aggregator';
      default:
        return null;
    }
  };

  addNewField(editPath, type) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];

      const newId = uuidv4();
      const newField = {
        id: newId,
        type,
        field: '',
        value: getDefaultValueForType(type),
      };

      return {
        [configTypeKey]: {
          ...configData,
          newConfigFields: this.editConfigHelper(
            configData.newConfigFields,
            [...editPath, newId],
            newField,
          ),
        },
      };
    });
  }

  editNewField(editPath, id, field, value) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];

      const newField = {
        ...this.getConfig(configData.newConfigFields, [...editPath, id]),
        field,
        value,
      };

      return {
        [configTypeKey]: {
          ...configData,
          newConfigFields: this.editConfigHelper(
            configData.newConfigFields,
            [...editPath, id],
            newField,
          ),
        },
      };
    });
  }

  deleteNewField(editPath, id) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];

      return {
        [configTypeKey]: {
          ...configData,
          newConfigFields: unsetAndCleanup(
            configData.newConfigFields,
            [...editPath, id],
            -1,
          ),
        },
      };
    });
  }

  deleteFields(editPaths) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];
      const configToChange = configData.changedConfig;

      return {
        [configTypeKey]: {
          ...configData,
          changedConfig: omit(configToChange, editPaths),
          configDirty: true,
        },
      };
    });
  }

  getConfig(config, editPath) {
    return get(config, editPath);
  }

  editConfigHelper(config, editPath, value) {
    // lodash's set will create arrays if the editPath contains numbers
    // So we need to use setWith to produce new elements as objects
    return editPath !== undefined && editPath !== null
      ? setWith(config, editPath, value, Object)
      : value;
  }

  editConfig(editPath, value) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];

      return {
        [configTypeKey]: {
          ...configData,
          draftConfig: this.editConfigHelper(
            {...configData.draftConfig},
            editPath,
            value,
          ),
        },
      };
    });
  }

  undoRevertConfig(editPath) {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];

      return {
        [configTypeKey]: {
          ...configData,
          draftConfig: unsetAndCleanup(configData.draftConfig, editPath, 0),
        },
      };
    });
  }

  resetConfig() {
    this.setState(state => {
      const configTypeKey = this.getConfigTypeKey(state.activeConfig);
      const configData = state[configTypeKey];
      const configToReset = configData.config;

      return {
        [configTypeKey]: {
          ...configData,
          changedConfig: configToReset,
          configDirty: false,
          draftConfig: {},
          newConfigFields: {},
        },
      };
    });
  }

  render() {
    const {
      activeConfig,
      controllerConfigMetadata,
      aggregatorConfigMetadata,
      errorMsg,
    } = this.state;

    const configTypeKey = this.getConfigTypeKey(this.state.activeConfig);
    const configData = this.state[configTypeKey];
    const e2eConfigProps = {
      config: configData.config,
      changedConfig: configData.changedConfig,
      configDirty: configData.configDirty,
      draftConfig: configData.draftConfig,
      newConfigFields: configData.newConfigFields,
      configMetadata:
        activeConfig === E2E.Aggregator
          ? aggregatorConfigMetadata
          : controllerConfigMetadata,
    };

    return (
      <div>
        <E2EConfigBody
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
