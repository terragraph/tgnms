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
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

export default class NetworkConfig extends React.Component {
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

  render() {
    const {
      topologyName,
      imageVersions,
      selectedImage,
      nodes,
      selectedNodes,

      editMode,
      baseConfigByVersion,
      newConfigFields,
      configMetadata,

      networkOverrideConfig,
      networkDraftConfig,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeConfigWithChanges,
    } = this.props;

    const baseConfig = this.getBaseConfig(
      baseConfigByVersion,
      editMode,
      selectedImage,
      selectedNodes,
    );

    // stack the configs by putting them in an array
    const stackedConfigs =
      editMode === CONFIG_VIEW_MODE.NODE
        ? [
            baseConfig,
            networkOverrideConfig,
            this.combineNodeConfigs(selectedNodes, nodeOverrideConfig),
          ]
        : [baseConfig, networkOverrideConfig];

    const selectedDraftConfig =
      editMode === CONFIG_VIEW_MODE.NODE
        ? this.combineNodeConfigs(selectedNodes, nodeDraftConfig)
        : networkDraftConfig;

    const nodesWithDrafts = Object.keys(nodeDraftConfig).filter(node => {
      return Object.keys(nodeDraftConfig[node]).length > 0;
    });

    const networkDraftExists = Object.keys(networkDraftConfig).length > 0;
    const hasUnsavedChanges = networkDraftExists || nodesWithDrafts.length > 0;

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
          nodeOverrideConfig={nodeOverrideConfig}
        />
        <NetworkConfigBody
          configs={stackedConfigs}
          configMetadata={configMetadata}
          draftConfig={selectedDraftConfig}
          newConfigFields={newConfigFields}
          nodesWithDrafts={nodesWithDrafts}
          selectedNodes={selectedNodes}
          editMode={editMode}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    );
  }
}

NetworkConfig.propTypes = {
  topologyName: PropTypes.string.isRequired,
  nodes: PropTypes.array.isRequired,
  imageVersions: PropTypes.array.isRequired,
  selectedImage: PropTypes.string.isRequired,
  selectedNodes: PropTypes.array.isRequired,

  editMode: PropTypes.string.isRequired,
  baseConfigByVersion: PropTypes.object.isRequired,
  newConfigFields: PropTypes.object.isRequired,
  configMetadata: PropTypes.object,

  networkOverrideConfig: PropTypes.object.isRequired,
  networkDraftConfig: PropTypes.object.isRequired,
  networkConfigWithChanges: PropTypes.object.isRequired,

  nodeOverrideConfig: PropTypes.object.isRequired,
  nodeDraftConfig: PropTypes.object.isRequired,
  nodeConfigWithChanges: PropTypes.object.isRequired,
};
