// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import PropTypes from 'prop-types';

import React from "react";
import { render } from "react-dom";
import SweetAlert from 'sweetalert-react';
import "sweetalert/dist/sweetalert.css";

import {
  getConfigsForTopology,
  setNetworkOverrideConfig,
  setNodeOverrideConfig
} from "../../apiutils/NetworkConfigAPIUtil.js";

import {
  CONFIG_VIEW_MODE,
  REVERT_VALUE,
  DEFAULT_BASE_KEY
} from "../../constants/NetworkConfigConstants.js";

import { Actions } from "../../constants/NetworkConstants.js";
import { NetworkConfigActions } from "../../actions/NetworkConfigActions.js";
import Dispatcher from "../../NetworkDispatcher.js";

import {
  getImageVersionsForNetwork,
  unsetAndCleanup,
  getDefaultValueForType
} from "../../helpers/NetworkConfigHelpers.js";
import NetworkConfig from "./NetworkConfig.js";

var _ = require("lodash");
const uuidv4 = require("uuid/v4");

export default class NetworkConfigContainer extends React.Component {
  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this)
    );

    const { viewContext } = props;

    // set up based on the view context when we change views
    // only needs to be done here because we know that this component will be un-mounted when the user switches out of it
    const editMode = viewContext.hasOwnProperty("node")
      ? CONFIG_VIEW_MODE.NODE
      : CONFIG_VIEW_MODE.NETWORK;
    const selectedNodes = viewContext.hasOwnProperty("node")
      ? [
          {
            name: viewContext.node.name,
            mac_addr: viewContext.node.mac_addr,
            imageVersion: viewContext.node.status_dump
              ? viewContext.node.status_dump.version
              : null,
            ignited:
              viewContext.node.status == 2 || viewContext.node.status == 3
          }
        ]
      : [];

    // TODO: @Tariq: the fact that this state is huge makes a compelling case for converting to redux.js
    // and splitting this into multiple data stores somewhere down the line
    this.state = {
      // base network config
      // map of software version to config
      baseConfig: {},

      // new fields to be added to the specified config
      // is cleared when the user switches a view as this is more "temporary" than even the unsaved config
      newConfigFields: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {},
      networkDraftConfig: {},

      // a version of the config that is akin to a merged copy of the 2 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 2 objects when submitting
      networkConfigWithChanges: {},

      // node override
      // config objects mapped by node mac_addr
      nodeOverrideConfig: {},
      nodeDraftConfig: {},

      // a version of the config that is akin to a merged copy of the 2 configs above
      // ONLY USED when an API call is submitted due to implementation pain for merging the 2 objects when submitting
      nodeConfigWithChanges: {},

      // edit mode to determine whether the user edits the network override or node override
      // changed by selecting node(s) or the network in the left pane in the UI
      editMode: editMode,

      // currently selected image version
      selectedImage: DEFAULT_BASE_KEY,

      // currently selected set of nodes which the config is being viewed as
      selectedNodes: selectedNodes,

      errorMsg: null
    };
  }

  componentDidMount() {
    const topologyName = this.props.networkConfig.topology.name;
    this.fetchConfigsForCurrentTopology(
      topologyName,
      this.props.networkConfig.topology
    );
  }

  componentWillReceiveProps(nextProps) {
    const topology = this.props.networkConfig.topology;
    const oldTopologyName = this.props.networkConfig.topology.name;
    const newTopologyName = nextProps.networkConfig.topology.name;

    const isNextTopologyValid = _.hasIn(nextProps.networkConfig, [
      "topology",
      "name"
    ]);
    if (isNextTopologyValid) {
      if (newTopologyName !== topology.name) {
        // perform the update if next topology is real/has a name and is a different topology that what we have now
        const newTopology = nextProps.networkConfig.topology;
        this.fetchConfigsForCurrentTopology(newTopology.name, newTopology);

        // reset the view mode
        this.setState({
          editMode: CONFIG_VIEW_MODE.NETWORK,
          selectedImage: DEFAULT_BASE_KEY,
          selectedNodes: []
        });
      } else {
        // still on the same topology, now check for nodes
        const oldImageVersionsSet = new Set(
          getImageVersionsForNetwork(topology)
        );
        const newImageVersions = getImageVersionsForNetwork(
          nextProps.networkConfig.topology
        );

        // if the incoming nodes has a base version difference compared to the old ones
        // then we need to re-fetch the base configs
        if (
          newImageVersions.some(newImage => !oldImageVersionsSet.has(newImage))
        ) {
          // only get the base config
          getConfigsForTopology(newTopologyName, newImageVersions, false);
        }
      }
    }
  }

  componentWillUnmount() {
    Dispatcher.unregister(this.dispatchToken);
  }

  getNodeMacs = () => {
    const { networkConfig } = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.map(node => node.mac_addr)
      : [];
  };

  // get node name, MAC, image version and if node is online
  getNodes = () => {
    const { networkConfig } = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.map(node => {
          return {
            name: node.name,
            mac_addr: node.mac_addr,
            imageVersion: node.status_dump ? node.status_dump.version : null,
            ignited: node.status == 2 || node.status == 3
          };
        })
      : [];
  };

  getNodesName2MacMap = () => {
    const { networkConfig } = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.reduce(function(map, node) {
        map[node.name] = node.mac_addr;
        return map;
        }, {})
      : {};
  };

  getNodesMac2NameMap = () => {
    const { networkConfig } = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.reduce(function(map, node) {
        map[node.mac_addr] = node.name;
        return map;
        }, {})
      : {};
  };

  handleDispatchEvent(payload) {
    const topologyName = this.props.networkConfig.topology.name;

    switch (payload.actionType) {
      // handle network config specific actions
      // actions that change the editing context
      case NetworkConfigActions.CHANGE_EDIT_MODE:
        this.changeEditMode(payload.editMode);
        break;
      case NetworkConfigActions.SELECT_IMAGE:
        // reset the new fields whenever user switches viewing context
        this.setState({
          selectedImage: payload.image,
          newConfigFields: {}
        });
        break;
      case NetworkConfigActions.SELECT_NODES:
        // reset the new fields whenever user switches viewing context
        this.setState({
          selectedNodes: payload.nodes,
          newConfigFields: {}
        });
        break;

      // actions that directly change the form on ONE FIELD
      case NetworkConfigActions.EDIT_CONFIG_FORM:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.setState({
            nodeDraftConfig: this.editNodeConfig(
              this.state.nodeDraftConfig,
              payload.editPath,
              payload.value
            ),
            nodeConfigWithChanges: this.editNodeConfig(
              this.state.nodeConfigWithChanges,
              payload.editPath,
              payload.value
            )
          });
        } else {
          this.editNetworkConfig(payload.editPath, payload.value);
        }
        break;
      case NetworkConfigActions.REVERT_CONFIG_OVERRIDE:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.setState({
            nodeDraftConfig: this.editNodeConfig(
              this.state.nodeDraftConfig,
              payload.editPath,
              REVERT_VALUE
            ),
            nodeConfigWithChanges: this.unsetAndCleanupNodes(
              this.state.nodeConfigWithChanges,
              payload.editPath,
              false
            )
          });
        } else {
          this.revertNetworkConfig(payload.editPath);
        }
        break;
      case NetworkConfigActions.DISCARD_UNSAVED_CONFIG:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.undoRevertNodeConfig(payload.editPath);
        } else {
          this.undoRevertNetworkConfig(payload.editPath);
        }
        break;

      // actions that for adding new fields for the form
      case NetworkConfigActions.ADD_NEW_FIELD:
        this.addNewField(payload.editPath, payload.type);
        break;
      case NetworkConfigActions.EDIT_NEW_FIELD:
        this.editNewField(
          payload.editPath,
          payload.id,
          payload.field,
          payload.value
        );
        break;
      case NetworkConfigActions.DELETE_NEW_FIELD:
        this.deleteNewField(payload.editPath, payload.id);
        break;

      // actions that change the ENTIRE FORM
      case NetworkConfigActions.SUBMIT_CONFIG:
        // TODO a quick hack to support nameBased config for M19 onwards
        // remove after cleaning code to use node name
        var useNameAsKey = false;
        var mac2NameMap = {};
        if (!this.isOldControllerVersion()) {
          useNameAsKey = true;
          mac2NameMap = this.getNodesMac2NameMap();
        }

        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          const pathsToPick = this.state.selectedNodes.map(
            node => node.mac_addr
          );

          const nodeConfigToSubmit = _.pick(
            this.state.nodeConfigWithChanges,
            pathsToPick
          );
          setNodeOverrideConfig(
            topologyName,
            nodeConfigToSubmit,
            Object.keys(this.state.nodeDraftConfig),
            true,
            useNameAsKey,
            mac2NameMap
          );
        } else {
          setNetworkOverrideConfig(
            topologyName,
            this.state.networkConfigWithChanges
          );
        }
        break;
      case NetworkConfigActions.SUBMIT_CONFIG_FOR_ALL_NODES:
        // TODO a quick hack to support nameBased config for M19 onwards
        // remove after cleaning code to use node name
        var useNameAsKey = false;
        var mac2NameMap = {};
        if (!this.isOldControllerVersion()) {
          useNameAsKey = true;
          mac2NameMap = this.getNodesMac2NameMap();
        }

        setNodeOverrideConfig(
          topologyName,
          this.state.nodeConfigWithChanges,
          Object.keys(this.state.nodeDraftConfig),
          false,
          useNameAsKey,
          mac2NameMap
        );
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
      case NetworkConfigActions.REFRESH_CONFIG:
        this.refreshConfig();
        break;

      // actions from API call returns
      case NetworkConfigActions.GET_BASE_CONFIG_SUCCESS:
        this.setState({ baseConfig: payload.config });
        break;
      case NetworkConfigActions.GET_NETWORK_CONFIG_SUCCESS:
        this.setState({
          networkOverrideConfig: payload.config,
          networkConfigWithChanges: payload.config
        });
        break;
      case NetworkConfigActions.GET_NODE_CONFIG_SUCCESS:
        // TODO a quick hack to support nameBased config for M19 onwards
        // remove after cleaning code to use node name
        if (!this.isOldControllerVersion()) {
          // Change name key to mac key
          var name2MacMap = this.getNodesName2MacMap();
          var config = {};
          Object.keys(payload.config).forEach(function(key) {
            var newkey = name2MacMap[key];
            if (newkey) {
              config[newkey] = payload.config[key];
            }
          });
          this.setState({
            nodeOverrideConfig: config,
            nodeConfigWithChanges: config
          });
        } else {
          this.setState({
            nodeOverrideConfig: payload.config,
            nodeConfigWithChanges: payload.config
          });
        }
        break;
      case NetworkConfigActions.SET_NETWORK_CONFIG_SUCCESS:
        this.saveNetworkConfig(payload.config);
        break;
      case NetworkConfigActions.SET_NODE_CONFIG_SUCCESS:
        this.saveNodeConfig(payload.config, payload.saveSelected);
        break;
      case NetworkConfigActions.SHOW_CONFIG_ERROR:
        this.setState({
          errorMsg: payload.errorText
        });
        break;
      default:
        break;
    }
  }

  // return true if controller vervion is older than M19
  isOldControllerVersion = () => {
    const { networkConfig } = this.props;
    if (networkConfig.controller_version) {
      let releaseIdx = networkConfig.controller_version.indexOf("RELEASE_");
      let releaseName = networkConfig.controller_version.substring(releaseIdx + 8);
      return releaseName.startsWith("M17") || releaseName.startsWith("M18");
    }
    return false;
  };

  changeEditMode = newEditMode => {
    if (this.state.editMode !== newEditMode) {
      const nodes = this.getNodes();

      // set 1 node to be selected if we switch into node view/edit mode
      // otherwise, clear selected nodes
      const newSelectedNodes =
        newEditMode === CONFIG_VIEW_MODE.NODE && nodes.length > 0
          ? [nodes[0]]
          : [];

      // reset the new fields whenever user switches viewing context
      this.setState({
        editMode: newEditMode,
        selectedNodes: newSelectedNodes,
        newConfigFields: {}
      });
    }
  };

  addNewField = (editPath, type) => {
    // first generate id, then construct a new object with fields
    // then set it
    const newId = uuidv4();
    const newField = {
      id: newId,
      type: type,
      field: "",
      value: getDefaultValueForType(type)
    };

    this.setState({
      newConfigFields: this.editConfig(
        this.state.newConfigFields,
        [...editPath, newId],
        newField
      )
    });
  };

  editNewField = (editPath, id, field, value) => {
    let newField = _.cloneDeep(
      this.getConfig(this.state.newConfigFields, [...editPath, id])
    );

    newField.field = field;
    newField.value = value;

    this.setState({
      newConfigFields: this.editConfig(
        this.state.newConfigFields,
        [...editPath, id],
        newField
      )
    });
  };

  deleteNewField = (editPath, id) => {
    // do not clean up empty objects as empty objects are allowed as new fields
    this.setState({
      newConfigFields: unsetAndCleanup(
        this.state.newConfigFields,
        [...editPath, id],
        -1
      )
    });
  };

  getConfig = (config, editPath) => {
    return _.get(config, editPath);
  };

  editConfig = (config, editPath, value) => {
    // _.set sets the object property defined in editPath to be the value passed in
    // it will create the path in the object if one does not exist
    return _.set(config, editPath, value);
  };

  unsetAndCleanupNodes = (config, editPath, unsetNodeMac) => {
    // if a config for a node becomes empty, remove the node mac_addr as a key if unsetNodeMac is set
    const stopIdx = unsetNodeMac ? 0 : 1;

    let newConfig = _.cloneDeep(config);
    this.state.selectedNodes.forEach(node => {
      newConfig = unsetAndCleanup(
        newConfig,
        [node.mac_addr, ...editPath],
        stopIdx
      );
    });

    return newConfig;
  };

  editNodeConfig = (config, editPath, value) => {
    let newNodeConfig = _.cloneDeep(config);
    this.state.selectedNodes.forEach(node => {
      newNodeConfig = this.editConfig(
        newNodeConfig,
        [node.mac_addr, ...editPath],
        value
      );
    });
    return newNodeConfig;
  };

  editNetworkConfig = (editPath, value) => {
    // get deep copies of the state so we don't directly mutate this.state
    this.setState({
      networkDraftConfig: this.editConfig(
        _.cloneDeep(this.state.networkDraftConfig),
        editPath,
        value
      ),
      networkConfigWithChanges: this.editConfig(
        _.cloneDeep(this.state.networkConfigWithChanges),
        editPath,
        value
      )
    });
  };

  revertNetworkConfig = editPath => {
    this.setState({
      networkDraftConfig: this.editConfig(
        _.cloneDeep(this.state.networkDraftConfig),
        editPath,
        REVERT_VALUE
      ),
      networkConfigWithChanges: unsetAndCleanup(
        this.state.networkConfigWithChanges,
        editPath,
        0
      )
    });
  };

  undoRevertNetworkConfig = editPath => {
    this.setState({
      networkDraftConfig: unsetAndCleanup(
        this.state.networkDraftConfig,
        editPath,
        0
      ),
      networkConfigWithChanges: this.editConfig(
        _.cloneDeep(this.state.networkOverrideConfig),
        editPath,
        _.get(this.state.networkOverrideConfig, editPath)
      )
    });
  };

  undoRevertNodeConfig = editPath => {
    let newNodeConfigWithChanges = _.cloneDeep(
      this.state.nodeConfigWithChanges
    );
    this.state.selectedNodes.forEach(node => {
      const nodeMac = node.mac_addr;

      newNodeConfigWithChanges = this.editConfig(
        newNodeConfigWithChanges,
        [nodeMac, ...editPath],
        _.get(this.state.nodeOverrideConfig, [nodeMac, ...editPath])
      );
    });
    this.setState({
      nodeDraftConfig: this.unsetAndCleanupNodes(
        this.state.nodeDraftConfig,
        editPath,
        true
      ),
      nodeConfigWithChanges: newNodeConfigWithChanges
    });
  };

  // functions called in the component when API calls return
  // save (returned when API sends us a successful ack)
  saveNetworkConfig = config => {
    this.setState({
      networkOverrideConfig: _.cloneDeep(config),
      networkConfigWithChanges: _.cloneDeep(config),
      networkDraftConfig: {},
      newConfigFields: {}
    });
  };

  saveNodeConfig = (config, saveSelected) => {
    if (saveSelected) {
      // changes pushed only for selected nodes
      let newNodeOverrideConfig = _.cloneDeep(this.state.nodeOverrideConfig);
      let newNodeDraftConfig = _.cloneDeep(this.state.nodeDraftConfig);

      this.state.selectedNodes.forEach(node => {
        const nodeMac = node.mac_addr;

        newNodeOverrideConfig[nodeMac] = this.state.nodeConfigWithChanges[
          nodeMac
        ];
        delete newNodeDraftConfig[nodeMac];
      });

      this.setState({
        nodeOverrideConfig: newNodeOverrideConfig,
        nodeDraftConfig: newNodeDraftConfig,
        newConfigFields: {}
      });
    } else {
      this.setState({
        nodeOverrideConfig: _.cloneDeep(this.state.nodeConfigWithChanges),
        nodeDraftConfig: {},
        newConfigFields: {}
      });
    }
  };

  resetNetworkConfig = () => {
    this.setState({
      networkDraftConfig: {},
      networkConfigWithChanges: _.cloneDeep(this.state.networkOverrideConfig),
      newConfigFields: {}
    });
  };

  resetSelectedNodesConfig = () => {
    let newNodeDraftConfig = _.cloneDeep(this.state.nodeDraftConfig);
    let newNodeConfigWithChanges = _.cloneDeep(
      this.state.nodeConfigWithChanges
    );

    this.state.selectedNodes.forEach(node => {
      const nodeMac = node.mac_addr;

      delete newNodeDraftConfig[nodeMac];
      newNodeConfigWithChanges[nodeMac] =
        this.state.nodeOverrideConfig[nodeMac] === undefined
          ? undefined
          : _.cloneDeep(this.state.nodeOverrideConfig[nodeMac]);
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig,
      nodeConfigWithChanges: newNodeConfigWithChanges,
      newConfigFields: {}
    });
  };

  resetAllNodesConfig = () => {
    this.setState({
      nodeDraftConfig: {},
      nodeConfigWithChanges: _.cloneDeep(this.state.nodeOverrideConfig),
      newConfigFields: {}
    });
  };

  refreshConfig = () => {
    // first we clear the drafts
    this.setState({
      networkDraftConfig: {},
      networkConfigWithChanges: _.cloneDeep(this.state.networkOverrideConfig),
      nodeDraftConfig: {},
      nodeConfigWithChanges: _.cloneDeep(this.state.nodeOverrideConfig),
      newConfigFields: {}
    });

    // then we make the API calls
    const topology = this.props.networkConfig.topology;
    const topologyName = topology.name;
    this.fetchConfigsForCurrentTopology(topologyName, topology);
  };

  fetchConfigsForCurrentTopology = (topologyName, topology) => {
    const imageVersions = getImageVersionsForNetwork(topology);
    getConfigsForTopology(topologyName, imageVersions, true);
  };

  render() {
    const { networkConfig } = this.props;

    const {
      baseConfig,
      newConfigFields,

      networkOverrideConfig,
      networkDraftConfig,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeConfigWithChanges,

      editMode,
      selectedImage,
      selectedNodes,
      errorMsg
    } = this.state;

    const topologyName = networkConfig.topology.name;
    const nodes = this.getNodes();

    return (
      <div>
        <NetworkConfig
          topologyName={topologyName}
          nodes={nodes}
          imageVersions={[
            DEFAULT_BASE_KEY,
            ...getImageVersionsForNetwork(networkConfig.topology)
          ]}
          selectedImage={selectedImage}
          selectedNodes={selectedNodes}
          editMode={editMode}
          baseConfigByVersion={baseConfig}
          newConfigFields={newConfigFields}
          networkOverrideConfig={networkOverrideConfig}
          networkDraftConfig={networkDraftConfig}
          networkConfigWithChanges={networkConfigWithChanges}
          nodeOverrideConfig={nodeOverrideConfig}
          nodeDraftConfig={nodeDraftConfig}
          nodeConfigWithChanges={nodeConfigWithChanges}
        />
        <SweetAlert
          type='error'
          show={this.state.errorMsg}
          title="Error"
          text={this.state.errorMsg}
          onConfirm={() => this.setState({ errorMsg: null })}
        />
      </div>
    );
  }
}

NetworkConfigContainer.propTypes = {
  networkConfig: PropTypes.object.isRequired,
  viewContext: PropTypes.object.isRequired
};
