/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfig.js
// top level "pure" component for rendering the network config of the given topology

import {
  CONFIG_VIEW_MODE,
  DEFAULT_BASE_KEY,
} from '../../constants/NetworkConfigConstants.js';
import NetworkConfigBody from './NetworkConfigBody.js';
import NetworkConfigLeftPane from './NetworkConfigLeftPane.js';
import isEmpty from 'lodash-es/isEmpty';
import isPlainObject from 'lodash-es/isPlainObject';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

export default class NetworkConfig extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    nodes: PropTypes.array.isRequired,
    imageVersions: PropTypes.array.isRequired,
    selectedImage: PropTypes.string.isRequired,
    selectedNodes: PropTypes.array.isRequired,

    editMode: PropTypes.string.isRequired,
    baseConfigByVersion: PropTypes.object.isRequired,
    autoOverrideConfig: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
    configMetadata: PropTypes.object,

    networkOverrideConfig: PropTypes.object.isRequired,
    networkDraftConfig: PropTypes.object.isRequired,
    removedNetworkOverrides: PropTypes.instanceOf(Set).isRequired,

    nodeOverrideConfig: PropTypes.object.isRequired,
    nodeDraftConfig: PropTypes.object.isRequired,
    removedNodeOverrides: PropTypes.object.isRequired, // <NodeMacAddr, Set>
  };

  getBaseConfig(baseConfigByVersion, editMode, selectedImage, selectedNodes) {
    let baseKey = DEFAULT_BASE_KEY;
    if (editMode === CONFIG_VIEW_MODE.NODE && selectedNodes[0].imageVersion) {
      baseKey = selectedNodes[0].imageVersion;
    } else if (editMode === CONFIG_VIEW_MODE.NETWORK && selectedImage !== '') {
      baseKey = selectedImage;
    }

    // handle the case where we have rendered the component but not received the API response
    // users don't usually see this
    return baseConfigByVersion[baseKey] === undefined
      ? {}
      : baseConfigByVersion[baseKey];
  }

  // nodeConfig is keyed by node name
  // this function combines multiple different node configs into a single config
  // TODO: since we're assuming you can only select a single node for now,
  // we'll just take the config for that particular node
  combineNodeConfigs(selectedNodes, nodeConfig) {
    return nodeConfig[selectedNodes[0].mac_addr] === undefined
      ? {}
      : nodeConfig[selectedNodes[0].mac_addr];
  }

  combineAutoNodeConfigs(selectedNodes, autoConfig) {
    return autoConfig[selectedNodes[0].name] === undefined
      ? {}
      : autoConfig[selectedNodes[0].name];
  }

  combineRemovedNodeOverrides(selectedNodes, removedNodeOverrides) {
    return removedNodeOverrides[selectedNodes[0].mac_addr] === undefined
      ? new Set()
      : removedNodeOverrides[selectedNodes[0].mac_addr];
  }

  render() {
    const {
      topologyName,
      imageVersions,
      selectedImage,
      nodes,
      selectedNodes,

      editMode,
      baseConfigByVersion,
      autoOverrideConfig,
      newConfigFields,
      configMetadata,

      networkOverrideConfig,
      networkDraftConfig,
      removedNetworkOverrides,

      nodeOverrideConfig,
      nodeDraftConfig,
      removedNodeOverrides,
    } = this.props;

    const baseConfig = this.getBaseConfig(
      baseConfigByVersion,
      editMode,
      selectedImage,
      selectedNodes,
    );

    // stack the configs by putting them in an array
    // Hide Auto Config for Network Overrides
    const stackedConfigs =
      editMode === CONFIG_VIEW_MODE.NODE
        ? [
            baseConfig,
            this.combineAutoNodeConfigs(selectedNodes, autoOverrideConfig),
            networkOverrideConfig,
            this.combineNodeConfigs(selectedNodes, nodeOverrideConfig),
          ]
        : [baseConfig, {}, networkOverrideConfig];

    const selectedDraftConfig =
      editMode === CONFIG_VIEW_MODE.NODE
        ? this.combineNodeConfigs(selectedNodes, nodeDraftConfig)
        : networkDraftConfig;

    const removedOverrides =
      editMode === CONFIG_VIEW_MODE.NODE
        ? this.combineRemovedNodeOverrides(selectedNodes, removedNodeOverrides)
        : removedNetworkOverrides;

    const nodesWithDrafts = Object.keys(nodeDraftConfig).filter(nodeMacAddr => {
      return !isEmpty(nodeDraftConfig[nodeMacAddr]);
    });

    const nodesWithOverrides = isPlainObject(nodeOverrideConfig)
      ? new Set(
          Object.keys(nodeOverrideConfig).filter(nodeMacAddr => {
            return (
              isPlainObject(nodeOverrideConfig[nodeMacAddr]) &&
              !isEmpty(nodeOverrideConfig[nodeMacAddr])
            );
          }),
        )
      : new Set();

    const networkDraftExists = !isEmpty(networkDraftConfig);
    const hasUnsavedChanges =
      networkDraftExists ||
      !isEmpty(nodesWithDrafts) ||
      isEmpty(removedNetworkOverrides) ||
      isEmpty(removedNodeOverrides);

    return (
      <div className="rc-network-config">
        <NetworkConfigLeftPane
          topologyName={topologyName}
          imageVersions={imageVersions}
          selectedImage={selectedImage}
          editMode={editMode}
          networkDraftExists={networkDraftExists}
          nodes={nodes}
          selectedNodes={selectedNodes}
          nodesWithDrafts={nodesWithDrafts}
          nodesWithOverrides={nodesWithOverrides}
          removedNodeOverrides={removedNodeOverrides} // removedOverrides for ALL nodes
        />
        <NetworkConfigBody
          topologyName={topologyName}
          configs={stackedConfigs}
          configMetadata={configMetadata}
          draftConfig={selectedDraftConfig}
          removedOverrides={removedOverrides} // removedOverrides for specific node
          newConfigFields={newConfigFields}
          nodesWithDrafts={nodesWithDrafts}
          removedNodeOverrides={removedNodeOverrides} // removedOverrides for ALL nodes
          selectedNodes={selectedNodes}
          editMode={editMode}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    );
  }
}
