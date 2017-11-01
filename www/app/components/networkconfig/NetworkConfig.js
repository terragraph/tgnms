// NetworkConfig.js
// top level "pure" component for rendering the network config of the given topology

import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';

import NetworkConfigLeftPane from './NetworkConfigLeftPane.js';
import NetworkConfigBody from './NetworkConfigBody.js';

export default class NetworkConfig extends React.Component {
  constructor(props) {
    super(props);
  }

  // nodeConfig is keyed by node name
  // this function combines multiple different node configs into a single config
  // TODO: since we're assuming you can only select a single node for now,
  // we'll just take the config for that particular node
  combineNodeConfigs = (selectedNodes, nodeConfig) => {
    return nodeConfig[selectedNodes[0]] === undefined ? {} : nodeConfig[selectedNodes[0]];
  }

  render() {
    const {
      topologyName,
      nodes,
      selectedNodes,

      editMode,
      baseConfig,

      networkOverrideConfig,
      networkDraftConfig,
      networkConfigWithChanges,

      nodeOverrideConfig,
      nodeDraftConfig,
      nodeConfigWithChanges,
    } = this.props;

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
  selectedNodes: React.PropTypes.array.isRequired,

  editMode: React.PropTypes.string.isRequired,
  baseConfig: React.PropTypes.object.isRequired,

  networkOverrideConfig: React.PropTypes.object.isRequired,
  networkDraftConfig: React.PropTypes.object.isRequired,
  networkConfigWithChanges: React.PropTypes.object.isRequired,

  nodeOverrideConfig: React.PropTypes.object.isRequired,
  nodeDraftConfig: React.PropTypes.object.isRequired,
  nodeConfigWithChanges: React.PropTypes.object.isRequired,
}
