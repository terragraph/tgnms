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

    // TODO: @Tariq: the fact that this state is huge makes a compelling case for converting to redux.js
    // and splitting this into multiple data stores somewhere down the line
    this.state = {
      // base network config
      // at first this is for the entire topology
      // later, we should map image version to one of these objects
      baseConfig: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {},
      networkDraftConfig: {},
      networkRevertFields: {},

      // a version of the config that is akin to a merged copy of the 3 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 3 objects when submitting
      networkConfigWithChanges: {},

      // node override
      // config objects mapped by node
      nodeOverrideConfig: {},
      nodeDraftConfig: {},
      nodeRevertFields: {},

      // a version of the config that is akin to a merged copy of the 3 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 3 objects when submitting
      nodeConfigWithChanges: {},

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
      // actions that change the editing context
      case NetworkConfigActions.CHANGE_EDIT_MODE:
        this.changeEditMode(payload.editMode);
        break;
      case NetworkConfigActions.SELECT_NODES:
        this.setState({selectedNodes: payload.nodes});
        break;

      // actions that directly change the form on ONE FIELD
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.editNodeConfig(payload.editPath, payload.value);
        } else {
          this.editNetworkConfig(payload.editPath, payload.value);
        }
        break;
      case NetworkConfigActions.REVERT_CONFIG_OVERRIDE:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.revertNodeConfig(payload.editPath);
        } else {
          this.revertNetworkConfig(payload.editPath);
        }
        break;

      // actions that change the ENTIRE FORM
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
        this.setState({networkOverrideConfig: payload.config, networkConfigWithChanges: payload.config});
        break;
      case NetworkConfigActions.GET_NODE_CONFIG_SUCCESS:
        this.setState({nodeOverrideConfig: payload.config, nodeConfigWithChanges: payload.config});
        break;
      case NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS:
        this.saveNetworkConfig(payload.config);
        break;
      case NetworkConfigActions.SET_NODE_CONFIG_SUCCESS:
        this.saveNodeConfig(payload.config, true);
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
    const {nodeDraftConfig, nodeConfigWithChanges, selectedNodes} = this.state;

    // deep copy to avoid mutating this.state directly
    let newNodeDraftConfig = _.cloneDeep(nodeDraftConfig);
    let newNodeConfigWithChanges = _.cloneDeep(nodeConfigWithChanges);

    selectedNodes.forEach((node) => {
      newNodeDraftConfig = this.editConfig(newNodeDraftConfig, [node, ...editPath], value);
      newNodeConfigWithChanges = this.editConfig(newNodeConfigWithChanges, [node, ...editPath], value);
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig,
      nodeConfigWithChanges: newNodeConfigWithChanges,
    });
  }

  editNetworkConfig = (editPath, value) => {
    const {networkDraftConfig, networkConfigWithChanges} = this.state;

    // get deep copies of the state so we don't directly mutate this.state
    this.setState({
      networkDraftConfig: this.editConfig(_.cloneDeep(networkDraftConfig), editPath, value),
      networkConfigWithChanges: this.editConfig(_.cloneDeep(networkConfigWithChanges), editPath, value),
    });
  }

  editConfig = (config, editPath, value) => {
    // _.set sets the object property defined in editPath to be the value passed in
    // it will create the path in the object if one does not exist
    return _.set(config, editPath, value);
  }

  // TODO: set state of newNodeConfigWithChanges
  revertNodeConfig = (editPath) => {
    const {nodeRevertFields, selectedNodes} = this.state;

    // deep copy to avoid mutating this.state directly
    let newNodeRevertFields = _.cloneDeep(nodeRevertFields);

    selectedNodes.forEach((node) => {
      newNodeRevertFields = this.editConfig(newNodeRevertFields, [node, ...editPath], true);
    });

    this.setState({
      nodeRevertFields: newNodeRevertFields,
    });
  }

  // TODO: set state of newNetworkConfigWithChanges
  revertNetworkConfig = (editPath) => {
    this.setState({
      networkRevertFields: this.editConfig(_.cloneDeep(this.state.networkRevertFields), editPath, true),
    });
  }

  revertConfig = (draftConfig, revertFields, editPath) => {
    const newRevertFields = _.set(revertFields, editPath, true);
    const newDraftConfig = _.merge({}, draftConfig);
    _.unset(newDraftConfig, editPath);

    return {};
  }

  unsetAndCleanup = (obj, editPath) => {}

  // functions called in the component when API calls return
  // save (returned when API sends us a successful ack)
  saveNetworkConfig = (config) => {
    this.setState({
      networkOverrideConfig: _.cloneDeep(this.state.networkConfigWithChanges),
      networkDraftConfig: {},
    });
  }

  saveNodeConfig = (config, saveSelected) => {
    if (saveSelected) {
      // changes pushed only for selected nodes
      let newNodeOverrideConfig = _.cloneDeep(this.state.nodeOverrideConfig);
      let newNodeDraftConfig = _.cloneDeep(this.state.nodeDraftConfig);

      this.state.selectedNodes.forEach((node) => {
        newNodeOverrideConfig[node] = this.state.nodeConfigWithChanges[node];
        delete newNodeDraftConfig[node];
      });

      this.setState({
        nodeOverrideConfig: newNodeOverrideConfig,
        nodeDraftConfig: newNodeDraftConfig,
      });
    } else {
      this.setState({
        nodeOverrideConfig: _.cloneDeep(this.state.nodeConfigWithChanges),
        nodeDraftConfig: {},
      });
    }
  }

  resetNetworkConfig = () => {
    this.setState({
      networkDraftConfig: {},
      networkConfigWithChanges: _.cloneDeep(this.state.networkOverrideConfig),
    });
  }

  resetSelectedNodesConfig = () => {
    let newNodeDraftConfig = _.cloneDeep(this.state.nodeDraftConfig);
    let newNodeConfigWithChanges = _.cloneDeep(this.state.nodeConfigWithChanges);

    this.state.selectedNodes.forEach((node) => {
      delete newNodeDraftConfig[node];
      newNodeConfigWithChanges[node] = this.state.nodeOverrideConfig[node] === undefined ?
        undefined : _.cloneDeep(this.state.nodeOverrideConfig[node]);
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig,
      nodeConfigWithChanges: newNodeConfigWithChanges,
    });
  }

  resetAllNodesConfig = () => {
    this.setState({
      nodeDraftConfig: {},
      nodeConfigWithChanges: _.cloneDeep(this.state.nodeOverrideConfig),
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
      networkRevertFields,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeRevertFields,
      nodeConfigWithChanges,

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
        networkRevertFields={networkRevertFields}
        networkConfigWithChanges={networkConfigWithChanges}

        nodeOverrideConfig={nodeOverrideConfig}
        nodeDraftConfig={nodeDraftConfig}
        nodeRevertFields={nodeRevertFields}
        nodeConfigWithChanges={nodeConfigWithChanges}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
