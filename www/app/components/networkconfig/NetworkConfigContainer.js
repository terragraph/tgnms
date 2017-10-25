// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

var _ = require('lodash');

import {
  getBaseConfig, getNetworkOverrideConfig, getNodeOverrideConfig
} from '../../apiutils/NetworkConfigAPIUtil.js';

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';

import { Actions } from '../../constants/NetworkConstants.js';
import { NetworkConfigActions } from '../../actions/NetworkConfigActions.js';
import Dispatcher from '../../NetworkDispatcher.js';

import NetworkConfig from './NetworkConfig.js';

export default class NetworkConfigContainer extends React.Component {
  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    const topologyName = props.networkConfig.topology.name;
    this.fetchConfigsForCurrentTopology(topologyName);

    this.state = {
      // base network config
      // at first this is for the entire topology
      // later, we should map image version to one of these objects
      baseConfig: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {},
      networkDraftConfig: {},
      networkUnsavedConfig: {},

      // node override
      // config objects mapped by node
      nodeOverrideConfig: {},
      nodeDraftConfig: {},
      nodeUnsavedConfig: {},

      // edit mode to determine whether the user edits the network override or node override
      editMode: CONFIG_VIEW_MODE.NETWORK,

      // currently selected set of nodes which the config is being viewed as
      selectedNodes: [],
    }
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      // handle common actions
      case Actions.TOPOLOGY_SELECTED:
        this.fetchConfigsForCurrentTopology(payload.networkName);
        break;

      // handle network config specific actions
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        const {editPath, value} = payload;
        const {editMode} = this.state;

        // if editMode is CONFIG_VIEW_MODE.NODE, we edit the node override
        // else we edit the network override (even if the user is viewing base)
        if (editMode === CONFIG_VIEW_MODE.NODE) {
          this.editNodeConfig(editPath, value);
        } else {
          this.editNetworkConfig(editPath, value);
        }

        break;
      case NetworkConfigActions.BASE_CONFIG_LOAD_SUCCESS:
        this.setState({
          baseConfig: payload.config,
        });
        break;
      case NetworkConfigActions.NETWORK_CONFIG_LOAD_SUCCESS:
        this.setState({
          networkOverrideConfig: payload.config
        });
        break;
      case NetworkConfigActions.NODE_CONFIG_LOAD_SUCCESS:
        this.setState({
          nodeOverrideConfig: payload.config
        });
        break;
      default:
        break;
    }
  }

  editNodeConfig = (editPath, value) => {

  }

  editNetworkConfig = (editPath, value) => {
    const {networkOverrideConfig} = this.state;

    // TODO: remove this ASAP since it's just a test
    const {baseConfig} = this.state;
    this.setState({
      baseConfig: this.editConfig(baseConfig, editPath, value)
    });


    // this.setState({
    //   networkOverrideConfig: this.editConfig(networkOverrideConfig, editPath, value)
    // });


    // const {networkUnsavedConfig} = this.state;
    // this.setState({
    //   networkUnsavedConfig: this.editConfig(networkUnsavedConfig, editPath, value)
    // });
  }

  editConfig = (config, editPath, value) => {
    // _.set mutates the object passed in
    return _.set(config, editPath, value);
  }

  fetchConfigsForCurrentTopology = (topologyName) => {
    // each API call's success actions will update different parts of the state
    // so it's safe to fire all 3 at once
    getBaseConfig(topologyName);
    getNetworkOverrideConfig(topologyName);
    getNodeOverrideConfig(topologyName);
  }

  render() {
    const {networkConfig} = this.props;

    const {
      baseConfig,
      networkOverrideConfig,
      networkDraftConfig,
      nodeOverrideConfig,
      nodeDraftConfig,
      editMode,
      selectedNodes,
    } = this.state;

    const selectedOverrideConfig = (editMode === CONFIG_VIEW_MODE.NODE) ?
      nodeOverrideConfig : networkOverrideConfig;

    const selectedDraftConfig = (editMode === CONFIG_VIEW_MODE.NODE) ?
      nodeDraftConfig : networkDraftConfig;

    const topologyName = networkConfig.topology.name;

    const nodes = (networkConfig.topology && networkConfig.topology.nodes) ?
      networkConfig.topology.nodes : []; // fetch from the topology

    // TODO: figure out the logic for displaying views in here
    // maybe create a new JSON object that tells us what kind of setting a field originates from??
    // right now to get the UI working I will just use one config
    return (
      <NetworkConfig
        topologyName={topologyName}
        nodes={nodes}
        selectedNodes={selectedNodes}

        editMode={editMode}
        baseConfig={baseConfig}
        networkOverrideConfig={networkOverrideConfig}
        nodeOverrideConfig={nodeOverrideConfig}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
