// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

var _ = require('lodash');

import {
  getBaseConfig,
  getNetworkOverrideConfig,
  getNodeOverrideConfig,
  setNetworkOverrideConfig,
  setNodeOverrideConfig,
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

    // for this diff, some of these states are unused, they're defined here for future use
    this.state = {
      // base network config
      // at first this is for the entire topology
      // later, we should map image version to one of these objects
      baseConfig: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {},
      networkDraftConfig: {},

      // node override
      // config objects mapped by node
      nodeOverrideConfig: {},
      nodeDraftConfig: {},

      // edit mode to determine whether the user edits the network override or node override
      // changed by selecting node(s) or the network in the left pane in the UI
      editMode: CONFIG_VIEW_MODE.NETWORK,

      // currently selected set of nodes which the config is being viewed as
      selectedNodes: [],
    }
  }

  componentDidMount() {
    const topologyName = this.props.networkConfig.topology.name;
    this.fetchConfigsForCurrentTopology(topologyName);
  }

  componentWillUnmount() {
    // un-register once hidden
    Dispatcher.unregister(this.dispatchToken);
  }

  getNodes = () => {
    const {networkConfig} = this.props;
    return (networkConfig.topology && networkConfig.topology.nodes) ?
      networkConfig.topology.nodes.map(node => node.name) : []; // fetch from the topology
  }

  handleDispatchEvent(payload) {
    const {
      editMode,
      baseConfig,
      networkOverrideConfig,
      nodeOverrideConfig,

      selectedNodes,
    } = this.state;

    switch (payload.actionType) {
      // handle common actions
      case Actions.TOPOLOGY_SELECTED:
        this.fetchConfigsForCurrentTopology(payload.networkName);
        break;

      // handle network config specific actions
      case NetworkConfigActions.CHANGE_EDIT_MODE:
        this.changeEditMode(payload.editMode);
        break;
      case NetworkConfigActions.SELECT_NODES:
        this.setState({
          selectedNodes: payload.nodes
        });
        break;
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        const {editPath, value} = payload;
        console.log('EDITING FORM', editPath, value);

        // if editMode is CONFIG_VIEW_MODE.NODE, we edit the node override
        // else we edit the network override
        if (editMode === CONFIG_VIEW_MODE.NODE) {
          this.editNodeConfig(editPath, value);
        } else {
          this.editNetworkConfig(editPath, value);
        }
        break;
      case NetworkConfigActions.SUBMIT_CONFIG:
        if (editMode === CONFIG_VIEW_MODE.NODE) {
          setNodeOverrideConfig(nodeDraftConfig);
        } else {
          setNetworkOverrideConfig(networkDraftConfig);
        }
        break;

      // actions from API call returns
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

  changeEditMode = (newEditMode) => {
    if (this.state.editMode !== newEditMode) {
      const nodes = this.getNodes();

      // set 1 node to be selected if we switch into node view/edit mode
      // otherwise, clear selected nodes
      const newSelectedNodes = (newEditMode === CONFIG_VIEW_MODE.NODE && nodes.length > 0) ?
        [nodes[0]] : [];

      this.setState({
        editMode: newEditMode,
        selectedNodes: newSelectedNodes,
      });
    }
  }

  editNodeConfig = (editPath, value) => {
    const {nodeDraftConfig, selectedNodes} = this.state;

    let newNodeDraftConfig = Object.assign({}, nodeDraftConfig);
    selectedNodes.forEach((node) => {
      newNodeDraftConfig = this.editConfig(newNodeDraftConfig, [node, ...editPath], value);
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig
    });
  }

  editNetworkConfig = (editPath, value) => {
    const {networkDraftConfig} = this.state;

    this.setState({
      networkDraftConfig: this.editConfig(networkDraftConfig, editPath, value)
    });
  }

  editConfig = (config, editPath, value) => {
    // _.set sets the object property defined in editPath to be the value passed in
    // it will create the path in the object if one does not exist
    return _.set(config, editPath, value);
  }

  fetchConfigsForCurrentTopology = (topologyName) => {
    // each API call's success actions will update different parts of the state
    // so it's safe to fire all 3 at once
    getBaseConfig(topologyName);
    getNetworkOverrideConfig(topologyName);
    getNodeOverrideConfig(this.getNodes(), topologyName);
  }

  // nodeConfig is keyed by node name
  // this function combines multiple different node configs into a single config
  // TODO: since we're assuming you can only select a single node for now,
  // we'll just take the config for that particular node
  combineNodeConfigs = (selectedNodes, nodeConfig) => {
    return nodeConfig[selectedNodes[0]] === undefined ? {} : nodeConfig[selectedNodes[0]];
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

    // stack the configs by putting them in an array
    const stackedConfigs = (editMode === CONFIG_VIEW_MODE.NODE) ?
      [baseConfig, networkOverrideConfig, this.combineNodeConfigs(selectedNodes, nodeOverrideConfig)] :
      [baseConfig, networkOverrideConfig];

    const selectedDraftConfig = (editMode === CONFIG_VIEW_MODE.NODE) ?
      this.combineNodeConfigs(selectedNodes, nodeDraftConfig) : networkDraftConfig;

    const topologyName = networkConfig.topology.name;

    const nodes = this.getNodes();

    return (
      <NetworkConfig
        topologyName={topologyName}
        nodes={nodes}
        selectedNodes={selectedNodes}

        editMode={editMode}
        configs={stackedConfigs}
        draftConfig={selectedDraftConfig}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
