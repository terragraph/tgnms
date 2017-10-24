// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

import {
  getBaseConfig, getNetworkOverrideConfig, getNodeOverrideConfig
} from '../../apiutils/NetworkConfigAPIUtil.js';
import { Actions } from '../../constants/NetworkConstants.js';
import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';

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
      case Actions.TOPOLOGY_SELECTED:
        this.fetchConfigsForCurrentTopology(payload.networkName);
        break;
      case Actions.BASE_CONFIG_LOADED:
        this.setState({
          baseConfig: payload.config,
        });
        break;
      case Actions.NETWORK_OVERRIDE_CONFIG_LOADED:
        this.setState({
          networkOverrideConfig: payload.config
        });
        break;
      case Actions.NODE_OVERRIDE_CONFIG_LOADED:
        this.setState({
          nodeOverrideConfig: payload.config
        });
        break;
      default:
        break;
    }
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

        baseConfig={baseConfig}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
