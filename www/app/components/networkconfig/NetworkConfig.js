// NetworkConfig.js
// top level "pure" component for rendering the network config of the given topology

import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE, DEFAULT_BASE_KEY } from '../../constants/NetworkConfigConstants.js';

import NetworkConfigLeftPane from './NetworkConfigLeftPane.js';
import NetworkConfigBody from './NetworkConfigBody.js';

export default class NetworkConfig extends React.Component {
  constructor(props) {
    super(props);
  }

  getBaseConfig = (baseConfigByVersion, editMode, selectedImage, selectedNodes) => {
    let baseKey = DEFAULT_BASE_KEY;
    if (editMode === CONFIG_VIEW_MODE.NODE && selectedNodes[0].imageVersion) {
      baseKey = selectedNodes[0].imageVersion;
    } else if (editMode === CONFIG_VIEW_MODE.NETWORK && selectedImage !== '') {
      baseKey = selectedImage;
    }

    // handle the case where we have rendered the component but not received the API response
    // users don't usually see this
    return (baseConfigByVersion[baseKey] === undefined) ? {} : baseConfigByVersion[baseKey];
  }

  // nodeConfig is keyed by node name
  // this function combines multiple different node configs into a single config
  // TODO: since we're assuming you can only select a single node for now,
  // we'll just take the config for that particular node
  combineNodeConfigs = (selectedNodes, nodeConfig) => {
    return nodeConfig[selectedNodes[0].mac_addr] === undefined ? {} : nodeConfig[selectedNodes[0].mac_addr];
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

      networkOverrideConfig,
      networkDraftConfig,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeConfigWithChanges,
    } = this.props;

    const baseConfig = this.getBaseConfig(baseConfigByVersion, editMode, selectedImage, selectedNodes);

    // stack the configs by putting them in an array
    const stackedConfigs = (editMode === CONFIG_VIEW_MODE.NODE) ?
      [baseConfig, networkOverrideConfig, this.combineNodeConfigs(selectedNodes, nodeOverrideConfig)] :
      [baseConfig, networkOverrideConfig];

    const selectedDraftConfig = (editMode === CONFIG_VIEW_MODE.NODE) ?
      this.combineNodeConfigs(selectedNodes, nodeDraftConfig) : networkDraftConfig;

    const nodesWithDrafts = Object.keys(nodeDraftConfig).filter((node) => {
      return Object.keys(nodeDraftConfig[node]).length > 0
    });

    return (
      <div className='rc-network-config'>
        <NetworkConfigLeftPane
          topologyName={topologyName}
          imageVersions={imageVersions}
          selectedImage={selectedImage}

          editMode={editMode}
          networkDraftExists={Object.keys(networkDraftConfig).length > 0}

          nodes={nodes}
          selectedNodes={selectedNodes}
          nodesWithDrafts={nodesWithDrafts}
        />
        <NetworkConfigBody
          configs={stackedConfigs}
          draftConfig={selectedDraftConfig}

          networkConfigWithChanges={networkConfigWithChanges}
          nodeConfigWithChanges={nodeConfigWithChanges}
          editMode={editMode}
        />
      </div>
    );
  }
}

NetworkConfig.propTypes = {
  topologyName: React.PropTypes.string.isRequired,
  nodes: React.PropTypes.array.isRequired,
  imageVersions: React.PropTypes.array.isRequired,
  selectedImage: React.PropTypes.string.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,

  editMode: React.PropTypes.string.isRequired,
  baseConfigByVersion: React.PropTypes.object.isRequired,

  networkOverrideConfig: React.PropTypes.object.isRequired,
  networkDraftConfig: React.PropTypes.object.isRequired,
  networkConfigWithChanges: React.PropTypes.object.isRequired,

  nodeOverrideConfig: React.PropTypes.object.isRequired,
  nodeDraftConfig: React.PropTypes.object.isRequired,
  nodeConfigWithChanges: React.PropTypes.object.isRequired,
}
