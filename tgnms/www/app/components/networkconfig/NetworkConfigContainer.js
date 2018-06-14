/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfigContainer.js
// a container for NetworkConfig.js that acts as a store (stores state) and action dispatch handler

import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import {NetworkConfigActions} from '../../actions/NetworkConfigActions.js';
import {
  getConfigsForTopology,
  getConfigMetadata,
  getNetworkOverrideConfig,
  getNodeOverrideConfig,
  setNetworkOverrideConfig,
  setNodeOverrideConfig,
} from '../../apiutils/NetworkConfigAPIUtil.js';
import {
  CONFIG_VIEW_MODE,
  PATH_DELIMITER,
  DEFAULT_BASE_KEY,
} from '../../constants/NetworkConfigConstants.js';
import {Actions} from '../../constants/NetworkConstants.js';
import {
  cleanupObject,
  createConfigToSubmit,
  getImageVersionsForNetwork,
  unsetAndCleanup,
  getDefaultValueForType,
  sortConfig,
} from '../../helpers/NetworkConfigHelpers.js';
import NetworkConfig from './NetworkConfig.js';
import {
  cloneDeep,
  get,
  has,
  hasIn,
  isEmpty,
  merge,
  pick,
  set,
  unset,
} from 'lodash-es';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
import SweetAlert from 'sweetalert-react';
import uuidv4 from 'uuid/v4';

export default class NetworkConfigContainer extends React.Component {
  static propTypes = {
    networkConfig: PropTypes.object.isRequired,
    viewContext: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent);

    const {viewContext} = props;

    // set up based on the view context when we change views
    // only needs to be done here because we know that this component will be un-mounted when the user switches out of it
    const editMode = viewContext.hasOwnProperty('node')
      ? CONFIG_VIEW_MODE.NODE
      : CONFIG_VIEW_MODE.NETWORK;

    const selectedNodes = viewContext.hasOwnProperty('node')
      ? [
          {
            name: viewContext.node.name,
            mac_addr: viewContext.node.mac_addr,
            imageVersion: viewContext.node.status_dump
              ? viewContext.node.status_dump.version
              : null,
            ignited:
              viewContext.node.status == 2 || viewContext.node.status == 3,
          },
        ]
      : [];

    // TODO: @Tariq: the fact that this state is huge makes a compelling case for converting to redux.js
    // and splitting this into multiple data stores somewhere down the line
    this.state = {
      // base network config
      // map of software version to config
      baseConfig: {},
      configMetadata: {},

      autoOverrideConfig: {}, // Read-Only

      // new fields to be added to the specified config
      // is cleared when the user switches a view as this is more "temporary" than even the unsaved config
      newConfigFields: {},

      // network override
      // one object for the entire network
      networkOverrideConfig: {}, // for backup on revert

      // version of the config with the changes by the user
      // the networkDraftConfig stores additions/edits to the changedNetworkConfig
      removedNetworkOverrides: new Set(), // Set of Edit Path Strings
      networkDraftConfig: {},

      // node override
      // config objects mapped by node mac_addr
      nodeOverrideConfig: {},

      // the nodeDraftConfig stores additions/edits to the changedNodeConfig
      removedNodeOverrides: {}, // Object of <NodeMacAddr, Set>
      nodeDraftConfig: {},

      // edit mode to determine whether the user edits the network override or node override
      // changed by selecting node(s) or the network in the left pane in the UI
      editMode,

      // currently selected image version
      selectedImage: DEFAULT_BASE_KEY,

      // currently selected set of nodes which the config is being viewed as
      selectedNodes,

      errorMsg: null,
    };
  }

  componentDidMount() {
    const topologyName = this.props.networkConfig.topology.name;
    this.fetchConfigsForCurrentTopology(
      topologyName,
      this.props.networkConfig.topology,
    );
  }

  componentDidUpdate(prevProps) {
    const oldTopologyName = prevProps.networkConfig.topology.name;
    const newTopologyName = this.props.networkConfig.topology.name;

    const isNewTopologyValid = hasIn(this.props.networkConfig, [
      'topology',
      'name',
    ]);
    if (isNewTopologyValid) {
      const newTopology = this.props.networkConfig.topology;
      if (newTopologyName !== oldTopologyName) {
        // perform the update if next topology is real/has a name and is a different topology that what we have now
        this.fetchConfigsForCurrentTopology(newTopology.name, newTopology);

        // reset the view mode
        this.setState({
          editMode: CONFIG_VIEW_MODE.NETWORK,
          selectedImage: DEFAULT_BASE_KEY,
          selectedNodes: [],
        });
      } else {
        // still on the same topology, now check for nodes
        const oldImageVersionsSet = new Set(
          getImageVersionsForNetwork(prevProps.networkConfig.topology),
        );
        const newImageVersions = getImageVersionsForNetwork(newTopology);

        // if the incoming nodes has a base version difference compared to the old ones
        // then we need to re-fetch the base configs
        if (
          newImageVersions.some(newImage => !oldImageVersionsSet.has(newImage))
        ) {
          // only get the base config
          getConfigsForTopology(
            newTopologyName,
            newImageVersions,
            false,
            false,
          );
        }
      }
    }
  }

  componentWillUnmount() {
    Dispatcher.unregister(this.dispatchToken);
  }

  getNodeMacs() {
    const {networkConfig} = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.map(node => node.mac_addr)
      : [];
  }

  // get node name, MAC, image version and if node is online
  getNodes() {
    const {networkConfig} = this.props;
    return networkConfig.topology && networkConfig.topology.nodes
      ? networkConfig.topology.nodes.map(node => {
          return {
            name: node.name,
            mac_addr: node.mac_addr,
            imageVersion: node.status_dump ? node.status_dump.version : null,
            ignited: node.status == 2 || node.status == 3,
          };
        })
      : [];
  }

  getNodesNameToMacMap() {
    const {networkConfig} = this.props;
    return has(networkConfig, 'topology.nodes')
      ? networkConfig.topology.nodes.reduce((map, node) => {
          map[node.name] = node.mac_addr;
          return map;
        }, {})
      : {};
  }

  getNodesMacToNameMap() {
    const {networkConfig} = this.props;
    return has(networkConfig, 'topology.nodes')
      ? networkConfig.topology.nodes.reduce((map, node) => {
          map[node.mac_addr] = node.name;
          return map;
        }, {})
      : {};
  }

  handleDispatchEvent = payload => {
    const topologyName = this.props.networkConfig.topology.name;

    switch (payload.actionType) {
      // actions that change the editing context
      case NetworkConfigActions.CHANGE_EDIT_MODE:
        this.changeEditMode(payload.editMode);
        break;
      case NetworkConfigActions.SELECT_IMAGE:
        // reset the new fields whenever user switches viewing context
        this.setState({
          selectedImage: payload.image,
          newConfigFields: {},
        });
        break;
      case NetworkConfigActions.SELECT_NODES:
        // reset the new fields whenever user switches viewing context
        this.setState({
          selectedNodes: payload.nodes,
          newConfigFields: {},
        });
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
      case NetworkConfigActions.DISCARD_UNSAVED_CONFIG:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.undoRevertNodeConfig(payload.editPath);
        } else {
          this.undoRevertNetworkConfig(payload.editPath);
        }
        break;

      // actions that directly change the form on MULTIPLE fields
      case NetworkConfigActions.EDIT_AND_DELETE_FIELDS:
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          this.editAndDeleteNodeConfigFields(
            payload.editPath,
            payload.value,
            payload.pathsToRemove,
          );
        } else {
          this.editAndDeleteNetworkConfigFields(
            payload.editPath,
            payload.value,
            payload.pathsToRemove,
          );
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
          payload.value,
        );
        break;
      case NetworkConfigActions.DELETE_NEW_FIELD:
        this.deleteNewField(payload.editPath, payload.id);
        break;

      // actions that change the ENTIRE FORM
      case NetworkConfigActions.SUBMIT_CONFIG: {
        if (this.state.editMode === CONFIG_VIEW_MODE.NODE) {
          const {
            nodeOverrideConfig,
            nodeDraftConfig,
            removedNodeOverrides,
            selectedNodes,
          } = this.state;

          // TODO a quick hack to support nameBased config for M19 onwards
          // remove after cleaning code to use node name
          let useNameAsKey = false;
          let macToNameMap = {};
          if (!this.isOldControllerVersion()) {
            useNameAsKey = true;
            macToNameMap = this.getNodesMacToNameMap();
          }

          const nodeConfigToSubmit = cloneDeep(nodeOverrideConfig);
          selectedNodes.forEach(node => {
            const nodeMacAddr = node.mac_addr;

            if (
              !isEmpty(nodeDraftConfig[nodeMacAddr]) ||
              !isEmpty(removedNodeOverrides[nodeMacAddr])
            ) {
              nodeConfigToSubmit[nodeMacAddr] = createConfigToSubmit(
                nodeOverrideConfig[nodeMacAddr],
                nodeDraftConfig[nodeMacAddr],
                removedNodeOverrides[nodeMacAddr],
              );
            }
          });

          // NOTE: We don't clean up empty overrides cause we need to send an empty object to the API to clear it

          setNodeOverrideConfig(
            topologyName,
            nodeConfigToSubmit,
            Object.keys(nodeConfigToSubmit),
            true,
            useNameAsKey,
            macToNameMap,
          );
        } else {
          const {
            networkOverrideConfig,
            networkDraftConfig,
            removedNetworkOverrides,
          } = this.state;

          if (
            !isEmpty(networkDraftConfig) ||
            !isEmpty(removedNetworkOverrides)
          ) {
            setNetworkOverrideConfig(
              topologyName,
              createConfigToSubmit(
                networkOverrideConfig,
                networkDraftConfig,
                removedNetworkOverrides,
              ),
            );
          }
        }
        break;
      }
      case NetworkConfigActions.SUBMIT_CONFIG_FOR_ALL_NODES: {
        const {
          nodeOverrideConfig,
          nodeDraftConfig,
          removedNodeOverrides,
        } = this.state;

        // TODO a quick hack to support nameBased config for M19 onwards
        // remove after cleaning code to use node name
        let useNameAsKey = false;
        let macToNameMap = {};
        if (!this.isOldControllerVersion()) {
          useNameAsKey = true;
          macToNameMap = this.getNodesMacToNameMap();
        }

        const nodeConfigToSubmit = cloneDeep(nodeOverrideConfig);
        this.getNodeMacs().forEach(nodeMacAddr => {
          if (
            !isEmpty(nodeDraftConfig[nodeMacAddr]) ||
            !isEmpty(removedNodeOverrides[nodeMacAddr])
          ) {
            nodeConfigToSubmit[nodeMacAddr] = createConfigToSubmit(
              nodeOverrideConfig[nodeMacAddr],
              nodeDraftConfig[nodeMacAddr],
              removedNodeOverrides[nodeMacAddr],
            );
          }
        });

        // NOTE: We don't clean up empty overrides cause we need to send an empty object to the API to clear it

        setNodeOverrideConfig(
          topologyName,
          nodeConfigToSubmit,
          Object.keys(nodeConfigToSubmit),
          false,
          useNameAsKey,
          macToNameMap,
        );
        break;
      }

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
        this.setState({baseConfig: payload.config});
        break;
      case NetworkConfigActions.GET_CONFIG_METADATA_SUCCESS: {
        const {
          baseConfig,
          networkOverrideConfig,
          changedNetworkConfig,
          nodeOverrideConfig,
          changedNodeConfig,
        } = this.state;
        const {metadata} = payload;
        this.setState({
          baseConfig: sortConfig(baseConfig, metadata),
          networkOverrideConfig: sortConfig(networkOverrideConfig, metadata),
          nodeOverrideConfig: sortConfig(nodeOverrideConfig, metadata),
          configMetadata: metadata,
        });
        break;
      }
      case NetworkConfigActions.GET_AUTO_CONFIG_SUCCESS:
        this.setState({
          autoOverrideConfig: payload.config,
        });
        break;
      case NetworkConfigActions.GET_NETWORK_CONFIG_SUCCESS:
        this.setState({
          networkOverrideConfig: payload.config,
        });
        break;
      case NetworkConfigActions.GET_NODE_CONFIG_SUCCESS:
        // TODO a quick hack to support nameBased config for M19 onwards
        // remove after cleaning code to use node name
        if (!this.isOldControllerVersion()) {
          // Change name key to mac key
          const nameToMacMap = this.getNodesNameToMacMap();
          const config = {};
          Object.keys(payload.config).forEach(key => {
            const newkey = nameToMacMap[key];
            if (newkey) {
              config[newkey] = payload.config[key];
            }
          });
          this.setState({
            nodeOverrideConfig: config,
          });
        } else {
          this.setState({
            nodeOverrideConfig: payload.config,
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
          errorMsg: payload.errorText,
        });
        break;
      default:
        break;
    }
  };

  // return true if controller version is older than M19
  isOldControllerVersion() {
    const {networkConfig} = this.props;
    if (networkConfig.controller_version) {
      const releaseIdx = networkConfig.controller_version.indexOf('RELEASE_');
      const releaseName = networkConfig.controller_version.substring(
        releaseIdx + 8,
      );
      return releaseName.startsWith('M17') || releaseName.startsWith('M18');
    }
    return false;
  }

  changeEditMode(newEditMode) {
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
        newConfigFields: {},
      });
    }
  }

  addNewField(editPath, type) {
    // first generate id, then construct a new object with fields
    // then set it
    const newId = uuidv4();
    const newField = {
      id: newId,
      type,
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
    const newField = cloneDeep(
      this.getConfig(this.state.newConfigFields, [...editPath, id]),
    );

    newField.field = field;
    newField.value = value;

    this.setState({
      newConfigFields: this.editConfigHelper(
        this.state.newConfigFields,
        [...editPath, id],
        newField,
      ),
    });
  }

  deleteNewField(editPath, id) {
    // do not clean up empty objects as empty objects are allowed as new fields
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
    return editPath !== undefined && editPath !== null
      ? set(config, editPath, value)
      : value;
  }

  unsetAndCleanupNodes(config, editPath, unsetNodeMac) {
    if (isEmpty(config)) {
      return config;
    }

    const stopIdx = unsetNodeMac ? 0 : 1;

    // if a config for a node becomes empty, remove the node mac_addr as a key if unsetNodeMac is set
    let newConfig = cloneDeep(config);
    this.state.selectedNodes.forEach(node => {
      newConfig = unsetAndCleanup(
        newConfig,
        [node.mac_addr, ...editPath],
        stopIdx,
      );
    });

    return newConfig;
  }

  editNetworkConfig(editPath, value) {
    this.setState({
      networkDraftConfig: this.editConfigHelper(
        cloneDeep(this.state.networkDraftConfig),
        editPath,
        value,
      ),
    });
  }

  editNodeConfig(editPath, value) {
    let newNodeConfig = cloneDeep(this.state.nodeDraftConfig);
    this.state.selectedNodes.forEach(node => {
      newNodeConfig = this.editConfigHelper(
        newNodeConfig,
        [node.mac_addr, ...editPath],
        value,
      );
    });

    this.setState({
      nodeDraftConfig: newNodeConfig,
    });
  }

  revertNetworkConfig(editPath) {
    this.setState({
      removedNetworkOverrides: cloneDeep(
        this.state.removedNetworkOverrides,
      ).add(editPath.join(PATH_DELIMITER)),
    });
  }

  revertNodeConfig(editPath) {
    const newRemovedNodeOverrides = cloneDeep(this.state.removedNodeOverrides);
    const editPathStr = editPath.join(PATH_DELIMITER);

    this.state.selectedNodes.forEach(node => {
      const nodeMacAddr = node.mac_addr;

      if (newRemovedNodeOverrides.hasOwnProperty(nodeMacAddr)) {
        newRemovedNodeOverrides[nodeMacAddr].add(editPathStr);
      } else {
        newRemovedNodeOverrides[nodeMacAddr] = new Set([editPathStr]);
      }
    });

    this.setState({
      removedNodeOverrides: newRemovedNodeOverrides,
    });
  }

  editAndDeleteNetworkConfigFields(editPath, value, pathsToRemove) {
    /*
      NOTE: Deletion differs from undoRevert in that it either removes an editPath from the draft
      OR adds it to the list of removed overrides whereas undoRevert will remove from the draft
      or remove it from the list of removed overrides to undo a change
    */
    const newNetworkDraftConfig = cloneDeep(this.state.networkDraftConfig);
    const newRemovedNetworkOverrides = cloneDeep(
      this.state.removedNetworkOverrides,
    );

    // Edit Network Config
    const editedNetworkDraft = this.editConfigHelper(
      newNetworkDraftConfig,
      editPath,
      value,
    );

    // Remove Fields from Network Config
    let removedFromDraft = false;

    pathsToRemove.forEach(path => {
      // Check if the path exists in the *old* draftConfig
      if (has(this.state.networkDraftConfig, path)) {
        unset(editedNetworkDraft, path);
        removedFromDraft = true;
      } else {
        // Otherwise add it to the set of removed paths
        newRemovedNetworkOverrides.add(path.join(PATH_DELIMITER));
      }
    });

    const cleanedNetworkDraft = removedFromDraft
      ? cleanupObject(editedNetworkDraft)
      : editedNetworkDraft;

    this.setState({
      networkDraftConfig: cleanedNetworkDraft,
      removedNetworkOverrides: newRemovedNetworkOverrides,
    });
  }

  editAndDeleteNodeConfigFields(editPath, value, pathsToRemove) {
    /*
      NOTE: Deletion differs from undoRevert in that it either removes an editPath from the draft
      OR adds it to the list of removed overrides whereas undoRevert will remove from the draft
      or remove it from the list of removed overrides to undo a change
    */
    const newNodeDraftConfig = cloneDeep(this.state.nodeDraftConfig);
    const newRemovedNodeOverrides = cloneDeep(this.state.removedNodeOverrides);

    this.state.selectedNodes.forEach(node => {
      // NOTE: Doesn't work when selecting multiple nodes as it removes it from all selected nodes
      const nodeMacAddr = node.mac_addr;

      // Edit Node Config for for iterated node
      newNodeDraftConfig[nodeMacAddr] = this.editConfigHelper(
        newNodeDraftConfig[nodeMacAddr],
        editPath,
        value,
      );

      // Remove Fields from Node Config for iterated node
      let removedFromNodeDraft = false;

      pathsToRemove.forEach(path => {
        // Check if the path exists in the *old* draftConfig
        const pathWithNodeAddr = [nodeMacAddr, ...path];

        if (has(this.state.nodeDraftConfig, pathWithNodeAddr)) {
          unset(newNodeDraftConfig, pathWithNodeAddr);
          removedFromNodeDraft = true;
        } else {
          // Otherwise add it to the set of removed paths
          const editPathStr = path.join(PATH_DELIMITER);

          if (newRemovedNodeOverrides.hasOwnProperty(nodeMacAddr)) {
            newRemovedNodeOverrides[nodeMacAddr].add(editPathStr);
          } else {
            newRemovedNodeOverrides[nodeMacAddr] = new Set([editPathStr]);
          }
        }
      });

      if (removedFromNodeDraft) {
        newNodeDraftConfig[nodeMacAddr] = cleanupObject(
          newNodeDraftConfig[nodeMacAddr],
        );
      }
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig,
      removedNodeOverrides: newRemovedNodeOverrides,
    });
  }

  undoRevertNetworkConfig(editPath) {
    const newRemovedNetworkOverrides = cloneDeep(
      this.state.removedNetworkOverrides,
    );
    const editPathStr = editPath.join(PATH_DELIMITER);

    if (newRemovedNetworkOverrides.has(editPathStr)) {
      // Undo-ing a network override removal
      newRemovedNetworkOverrides.delete(editPathStr);
      this.setState({
        removedNetworkOverrides: newRemovedNetworkOverrides,
      });
    } else {
      this.setState({
        networkDraftConfig: unsetAndCleanup(
          this.state.networkDraftConfig,
          editPath,
          0,
        ),
      });
    }
  }

  undoRevertNodeConfig(editPath) {
    const newRemovedNodeOverrides = cloneDeep(this.state.removedNodeOverrides);
    const editPathStr = editPath.join(PATH_DELIMITER);

    let undoRemovedOverride = false;
    for (const node of this.state.selectedNodes) {
      const nodeMacAddr = node.mac_addr;
      if (
        newRemovedNodeOverrides.hasOwnProperty(nodeMacAddr) &&
        newRemovedNodeOverrides[nodeMacAddr].has(editPathStr)
      ) {
        // NOTE: This wont work when you can select multiple nodes as it removes the field from all selected nodes
        newRemovedNodeOverrides[nodeMacAddr].delete(editPathStr);
        undoRemovedOverride = true;
      }
    }

    if (undoRemovedOverride) {
      // Undo-ing a node override removal
      this.setState({
        removedNodeOverrides: newRemovedNodeOverrides,
      });
    } else {
      this.setState({
        nodeDraftConfig: this.unsetAndCleanupNodes(
          this.state.nodeDraftConfig,
          editPath,
          true,
        ),
      });
    }
  }

  // functions called in the component when API calls return
  // save (returned when API sends us a successful ack)
  saveNetworkConfig(config) {
    this.setState({
      networkOverrideConfig: cloneDeep(config),
      removedNetworkOverrides: new Set(),
      networkDraftConfig: {},
      newConfigFields: {},
    });
  }

  saveNodeConfig(config, saveSelected) {
    if (saveSelected) {
      // changes pushed only for selected nodes
      const newNodeOverrideConfig = cloneDeep(this.state.nodeOverrideConfig);
      const newNodeDraftConfig = cloneDeep(this.state.nodeDraftConfig);
      const newRemovedNodeOverrides = cloneDeep(
        this.state.removedNodeOverrides,
      );

      this.state.selectedNodes.forEach(node => {
        const nodeMacAddr = node.mac_addr;

        newNodeOverrideConfig[nodeMacAddr] = config[nodeMacAddr];
        delete newNodeDraftConfig[nodeMacAddr];
        delete newRemovedNodeOverrides[nodeMacAddr];
      });

      this.setState({
        nodeOverrideConfig: newNodeOverrideConfig,
        nodeDraftConfig: newNodeDraftConfig,
        removedNodeOverrides: newRemovedNodeOverrides,
        newConfigFields: {},
      });
    } else {
      this.setState({
        nodeOverrideConfig: cloneDeep(config),
        removedNodeOverrides: {},
        nodeDraftConfig: {},
        newConfigFields: {},
      });
    }
  }

  resetNetworkConfig() {
    this.setState({
      networkDraftConfig: {},
      removedNetworkOverrides: new Set(),
      newConfigFields: {},
    });
  }

  resetSelectedNodesConfig() {
    const {nodeOverrideConfig} = this.state;
    const newNodeDraftConfig = cloneDeep(this.state.nodeDraftConfig);
    const newRemovedNodeOverrides = cloneDeep(this.state.removedNodeOverrides);

    this.state.selectedNodes.forEach(node => {
      const nodeMacAddr = node.mac_addr;

      delete newNodeDraftConfig[nodeMacAddr];
      delete newRemovedNodeOverrides[nodeMacAddr];

      // if (
      //   nodeOverrideConfig.hasOwnProperty(nodeMacAddr) &&
      //   Boolean(nodeOverrideConfig[nodeMacAddr])
      // ) {
      //   newChangedNodeConfig[nodeMacAddr] = cloneDeep(nodeOverrideConfig[nodeMacAddr]);
      // } else {
      //   delete newChangedNodeConfig[nodeMacAddr];
      // }

      // newChangedNodeConfig[nodeMacAddr] =
      //
      //   this.state.nodeOverrideConfig[nodeMacAddr] === undefined
      //     ? undefined
      //     : cloneDeep(this.state.nodeOverrideConfig[nodeMacAddr]);
    });

    this.setState({
      nodeDraftConfig: newNodeDraftConfig,
      removedNodeOverrides: newRemovedNodeOverrides,
      newConfigFields: {},
    });
  }

  resetAllNodesConfig() {
    this.setState({
      nodeDraftConfig: {},
      removedNodeOverrides: {},
      newConfigFields: {},
    });
  }

  refreshConfig() {
    this.setState(
      {
        networkDraftConfig: {},
        removedNetworkOverrides: new Set(),
        nodeDraftConfig: {},
        removedNodeOverrides: {},
        newConfigFields: {},
      },
      () => {
        const topology = this.props.networkConfig.topology;
        const topologyName = topology.name;
        this.fetchConfigsForCurrentTopology(topologyName, topology);
      },
    );
  }

  fetchConfigsForCurrentTopology(topologyName, topology) {
    const imageVersions = getImageVersionsForNetwork(topology);
    getConfigsForTopology(topologyName, imageVersions, true, true);
    getConfigMetadata(topologyName);
  }

  render() {
    const {networkConfig} = this.props;

    const {
      baseConfig,
      configMetadata,
      autoOverrideConfig,

      newConfigFields,
      networkOverrideConfig,
      networkDraftConfig,
      removedNetworkOverrides,

      nodeOverrideConfig,
      nodeDraftConfig,
      removedNodeOverrides,

      editMode,
      selectedImage,
      selectedNodes,
      errorMsg,
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
            ...getImageVersionsForNetwork(networkConfig.topology),
          ]}
          selectedImage={selectedImage}
          selectedNodes={selectedNodes}
          editMode={editMode}
          baseConfigByVersion={baseConfig}
          autoOverrideConfig={autoOverrideConfig}
          newConfigFields={newConfigFields}
          configMetadata={configMetadata}
          networkOverrideConfig={networkOverrideConfig}
          networkDraftConfig={networkDraftConfig}
          removedNetworkOverrides={removedNetworkOverrides}
          nodeOverrideConfig={nodeOverrideConfig}
          nodeDraftConfig={nodeDraftConfig}
          removedNodeOverrides={removedNodeOverrides}
        />
        <SweetAlert
          type="error"
          show={Boolean(this.state.errorMsg)}
          title="Error"
          text={this.state.errorMsg}
          onConfirm={() => this.setState({errorMsg: null})}
        />
      </div>
    );
  }
}
