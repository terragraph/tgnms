// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

var _ = require('lodash');

import {
  getBaseConfig,
  getNetworkOverrideConfig,
  getNodeOverrideConfig,
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

  getNodeMacs = () => {
    const {networkConfig} = this.props;
    return (networkConfig.topology && networkConfig.topology.nodes) ?
      networkConfig.topology.nodes.map(node => node.mac_addr) : []; // fetch from the topology
  }

  // get node name and MAC
  getNodes = () => {
    const {networkConfig} = this.props;
    return (networkConfig.topology && networkConfig.topology.nodes) ?
      networkConfig.topology.nodes.map((node) => {
        return {
          name: node.name,
          mac_addr: node.mac_addr
        };
      }) : []; // fetch from the topology
  }

  handleDispatchEvent(payload) {
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
        this.setState({selectedNodes: payload.nodes});
        break;
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        const {editPath, value} = payload;
        // if editMode is CONFIG_VIEW_MODE.NODE, we edit the node override
        // else we edit the network override
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.editNodeConfig(editPath, value);
        } else {
          this.editNetworkConfig(editPath, value);
        }
        break;
      case NetworkConfigActions.RESET_CONFIG:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.resetSelectedNodesConfig();
        } else {
          this.resetNetworkConfig();
        }
        break;
      case NetworkConfigActions.RESET_CONFIG_FOR_ALL_NODES:
        this.resetAllNodesConfig();
        break;

      // actions from API call returns
      case NetworkConfigActions.GET_BASE_CONFIG_SUCCESS:
        this.setState({baseConfig: payload.config});
        break;
      case NetworkConfigActions.GET_NETWORK_CONFIG_SUCCESS:
        this.setState({networkOverrideConfig: payload.config});
        break;
      case NetworkConfigActions.GET_NODE_CONFIG_SUCCESS:
        this.setState({nodeOverrideConfig: payload.config});
        break;
      case NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS:
        this.saveNetworkConfig(payload.config);
        break;
      case NetworkConfigActions.SET_NODE_CONFIG_SUCCESS:
        this.saveNodeConfig(payload.config);
        break;
      default:
        break;
    }
  }

  changeEditMode = (newEditMode) => {
    if (this.state.editMode !== newEditMode) {
      const nodes = this.getNodeMacs();

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

  saveNetworkConfig = (draftConfigForNetwork) => {
    // _.merge is like a deep version of Object.assign
    // here, we merge the draft override into the current override

    let newNetworkOverrideConfig = {};
    _.merge(newNetworkOverrideConfig, this.state.networkOverrideConfig, draftConfigForNetwork);

    this.setState({
      networkOverrideConfig: newNetworkOverrideConfig,
      networkDraftConfig: {},
    });
  }

  // TODO: this only pushes changes/draft for the selected, and discards FOR ALL OTHER NODES
  // I think we should let the user pick...
  saveNodeConfig = (draftConfigForSelectedNodes) => {
    let modifiedConfigsByNode = {};

    this.state.selectedNodes.forEach((node) => {
      let newConfigForNode = {};
      let existingNodeOverride = this.state.nodeOverrideConfig[node] === undefined ? {} : this.state.nodeOverrideConfig[node];

      // for each selected node, merge its existing override with its draft
      // this produces all modified node configs
      _.merge(newConfigForNode, existingNodeOverride, draftConfigForSelectedNodes);
      modifiedConfigsByNode[node] = newConfigForNode;
    });

    // now merge the current existing node overrides with the modified ones
    // and set that as our state
    let mergedNodeOverride = {};
    _.merge(mergedNodeOverride, this.state.nodeOverrideConfig, modifiedConfigsByNode);
    this.setState({
      nodeOverrideConfig: mergedNodeOverride,
      nodeDraftConfig: {},
    });
  }

  resetNetworkConfig = () => {
    // wipe the entire network draft config
    this.setState({
      networkDraftConfig: {}
    });
  }

  resetSelectedNodesConfig = () => {
    let newNodeDraftConfig = Object.assign({}, this.state.nodeDraftConfig);
    this.state.selectedNodes.forEach(node => delete newNodeDraftConfig[node]);
    this.setState({
      nodeDraftConfig: newNodeDraftConfig
    });
  }

  resetAllNodesConfig = () => {
    this.setState({
      nodeDraftConfig: {}
    });
  }

  fetchConfigsForCurrentTopology = (topologyName) => {
    // each API call's success actions will update different parts of the state
    // so it's safe to fire all 3 at once
    getBaseConfig(topologyName);
    getNetworkOverrideConfig(topologyName);
    getNodeOverrideConfig(this.getNodeMacs(), topologyName);
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

    const topologyName = networkConfig.topology.name;
    const nodes = this.getNodes();

    return (
      <NetworkConfig
        topologyName={topologyName}
        nodes={nodes}
        selectedNodes={selectedNodes}

        editMode={editMode}
        baseConfig={baseConfig}
        networkOverrideConfig={networkOverrideConfig}
        networkDraftConfig={networkDraftConfig}
        nodeOverrideConfig={nodeOverrideConfig}
        nodeDraftConfig={nodeDraftConfig}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
