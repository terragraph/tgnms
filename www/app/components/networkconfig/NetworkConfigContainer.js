// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import React from 'react';
import { render } from 'react-dom';

var _ = require('lodash');

import {
  getConfigsForTopology,
  setNetworkOverrideConfig,
  setNodeOverrideConfig,
} from '../../apiutils/NetworkConfigAPIUtil.js';

import { CONFIG_VIEW_MODE, REVERT_VALUE } from '../../constants/NetworkConfigConstants.js';

import { Actions } from '../../constants/NetworkConstants.js';
import { NetworkConfigActions } from '../../actions/NetworkConfigActions.js';
import Dispatcher from '../../NetworkDispatcher.js';

import { getImageVersionsForNetwork, unsetAndCleanup } from '../../helpers/NetworkConfigHelpers.js';
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
      // map of software version to config
      baseConfig: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {},
      networkDraftConfig: {},

      // a version of the config that is akin to a merged copy of the 3 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 3 objects when submitting
      networkConfigWithChanges: {},

      // node override
      // config objects mapped by node
      nodeOverrideConfig: {},
      nodeDraftConfig: {},

      // a version of the config that is akin to a merged copy of the 3 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 3 objects when submitting
      nodeConfigWithChanges: {},

      // edit mode to determine whether the user edits the network override or node override
      // changed by selecting node(s) or the network in the left pane in the UI
      editMode: CONFIG_VIEW_MODE.NETWORK,

      // currently selected image version
      selectedImage: '',

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

  // get node name, MAC and image version
  getNodes = () => {
    const {networkConfig} = this.props;
    return (networkConfig.topology && networkConfig.topology.nodes) ?
      networkConfig.topology.nodes.map((node) => {
        return {
          name: node.name,
          mac_addr: node.mac_addr,
          imageVersion: (node.status_dump) ? node.status_dump.version : null,
        };
      }) : []; // fetch from the topology
  }

  handleDispatchEvent(payload) {
    const topologyName = this.props.networkConfig.topology.name;

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
      case NetworkConfigActions.SELECT_IMAGE:
        this.setState({selectedImage: payload.image});
        break;
      case NetworkConfigActions.SELECT_NODES:
        this.setState({selectedNodes: payload.nodes});
        break;

      // actions that directly change the form on ONE FIELD
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.setState({
            nodeDraftConfig: this.editNodeConfig(this.state.nodeDraftConfig, payload.editPath, payload.value),
            nodeConfigWithChanges: this.editNodeConfig(this.state.nodeConfigWithChanges, payload.editPath, payload.value),
          });
        } else {
          this.editNetworkConfig(payload.editPath, payload.value);
        }
        break;
      case NetworkConfigActions.REVERT_CONFIG_OVERRIDE:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.setState({
            nodeDraftConfig: this.editNodeConfig(this.state.nodeDraftConfig, payload.editPath, REVERT_VALUE),
            nodeConfigWithChanges: this.unsetAndCleanupNodes(this.state.nodeConfigWithChanges, payload.editPath),
          });
        } else {
          this.revertNetworkConfig(payload.editPath);
        }
        break;
      case NetworkConfigActions.UNDO_REVERT_CONFIG:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.undoRevertNodeConfig(payload.editPath);
        } else {
          this.undoRevertNetworkConfig(payload.editPath);
        }
        break;

      // actions that change the ENTIRE FORM
      case NetworkConfigActions.SUBMIT_CONFIG:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          const pathsToPick = this.state.selectedNodes.map(node => node.mac_addr);
          const nodeConfigToSubmit = _.pick(this.state.nodeConfigWithChanges, pathsToPick);
          setNodeOverrideConfig(topologyName, nodeConfigToSubmit, Object.keys(this.state.nodeDraftConfig), true);
        } else {
          setNetworkOverrideConfig(topologyName, this.state.networkConfigWithChanges);
        }
        break;
      case NetworkConfigActions.SUBMIT_CONFIG_FOR_ALL_NODES:
        setNodeOverrideConfig(topologyName, this.state.nodeConfigWithChanges, Object.keys(this.state.nodeDraftConfig), false);
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
        this.setState({networkOverrideConfig: payload.config, networkConfigWithChanges: payload.config});
        break;
      case NetworkConfigActions.GET_NODE_CONFIG_SUCCESS:
        this.setState({nodeOverrideConfig: payload.config, nodeConfigWithChanges: payload.config});
        break;
      case NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS:
        this.saveNetworkConfig(payload.config);
        break;
      case NetworkConfigActions.SET_NODE_CONFIG_SUCCESS:
        this.saveNodeConfig(payload.config, payload.saveSelected);
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

  editConfig = (config, editPath, value) => {
    // _.set sets the object property defined in editPath to be the value passed in
    // it will create the path in the object if one does not exist
    return _.set(config, editPath, value);
  }

  unsetAndCleanupNodes = (config, editPath) => {
    let newConfig = _.cloneDeep(config);
    this.state.selectedNodes.forEach((node) => {
      newConfig = unsetAndCleanup(newConfig, [node.mac_addr, ...editPath], 1);
    });

    return newConfig;
  }

  editNodeConfig = (config, editPath, value) => {
    let newNodeConfig = _.cloneDeep(config);
    this.state.selectedNodes.forEach((node) => {
      newNodeConfig = this.editConfig(newNodeConfig, [node.mac_addr, ...editPath], value);
    });
    return newNodeConfig;
  }

  editNetworkConfig = (editPath, value) => {
    // get deep copies of the state so we don't directly mutate this.state
    this.setState({
      networkDraftConfig: this.editConfig(_.cloneDeep(this.state.networkDraftConfig), editPath, value),
      networkConfigWithChanges: this.editConfig(_.cloneDeep(this.state.networkConfigWithChanges), editPath, value),
    });
  }

  revertNetworkConfig = (editPath) => {
    this.setState({
      networkDraftConfig: this.editConfig(_.cloneDeep(this.state.networkDraftConfig), editPath, REVERT_VALUE),
      networkConfigWithChanges: unsetAndCleanup(this.state.networkConfigWithChanges, editPath, 0),
    });
  }

  undoRevertNetworkConfig = (editPath) => {
    this.setState({
      networkDraftConfig: unsetAndCleanup(this.state.networkDraftConfig, editPath, 0),
      networkConfigWithChanges: this.editConfig(
        _.cloneDeep(this.state.networkOverrideConfig),
        editPath,
        _.get(this.state.networkOverrideConfig, editPath),
      ),
    });
  }

  undoRevertNodeConfig = (editPath) => {
    let newNodeConfigWithChanges = _.cloneDeep(this.state.nodeConfigWithChanges);
    this.state.selectedNodes.forEach((node) => {
      const nodeMac = node.mac_addr;

      newNodeConfigWithChanges = this.editConfig(
        newNodeConfigWithChanges,
        [nodeMac, ...editPath],
        _.get(this.state.nodeOverrideConfig, [nodeMac, ...editPath]),
      );
    });
    this.setState({
      nodeDraftConfig: this.unsetAndCleanupNodes(this.state.nodeDraftConfig, editPath),
      nodeConfigWithChanges: newNodeConfigWithChanges,
    });
  }

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
        const nodeMac = node.mac_addr;

        newNodeOverrideConfig[nodeMac] = this.state.nodeConfigWithChanges[nodeMac];
        delete newNodeDraftConfig[nodeMac];
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
      const nodeMac = node.mac_addr;

      delete newNodeDraftConfig[nodeMac];
      newNodeConfigWithChanges[nodeMac] = this.state.nodeOverrideConfig[nodeMac] === undefined ?
        undefined : _.cloneDeep(this.state.nodeOverrideConfig[nodeMac]);
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
    // const imageVersions = getImageVersionsForNetwork(this.props.networkConfig.topology);
    const nodeMacs = this.getNodeMacs();

    // node macs are outdated
    getConfigsForTopology(topologyName);


    // each API call's success actions will update different parts of the state
    // so it's safe to fire all 3 at once
    // setTimeout(() => getNetworkOverrideConfig(topologyName), 10);
    // getNetworkOverrideConfig(topologyName);
    // getNodeOverrideConfig(this.getNodeMacs(), topologyName);
  }

  render() {
    const {networkConfig} = this.props;

    const {
      baseConfig,

      networkOverrideConfig,
      networkDraftConfig,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeConfigWithChanges,

      editMode,
      selectedImage,
      selectedNodes,
    } = this.state;

    const topologyName = networkConfig.topology.name;
    const nodes = this.getNodes();

    return (
      <NetworkConfig
        topologyName={topologyName}
        nodes={nodes}
        imageVersions={getImageVersionsForNetwork(networkConfig.topology)}
        selectedImage={selectedImage}
        selectedNodes={selectedNodes}
        editMode={editMode}
        baseConfigByVersion={baseConfig}

        networkOverrideConfig={networkOverrideConfig}
        networkDraftConfig={networkDraftConfig}
        networkConfigWithChanges={networkConfigWithChanges}

        nodeOverrideConfig={nodeOverrideConfig}
        nodeDraftConfig={nodeDraftConfig}
        nodeConfigWithChanges={nodeConfigWithChanges}
      />
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: React.PropTypes.object.isRequired
}
