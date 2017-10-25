// NetworkConfig.js
// top level "pure" component for rendering the network config of the given topology

import React from 'react';
import { render } from 'react-dom';

import NetworkConfigLeftPane from './NetworkConfigLeftPane.js';
import NetworkConfigBody from './NetworkConfigBody.js';

export default class NetworkConfig extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
      topologyName,
      nodes,
      selectedNodes,

      editMode,
      baseConfig,
      networkOverrideConfig,
      nodeOverrideConfig
    } = this.props;

    return (
      <div className='rc-network-config'>
        <NetworkConfigLeftPane
          topologyName={topologyName}

          editMode={editMode}
          nodes={nodes}
          selectedNodes={selectedNodes}
        />
        <NetworkConfigBody
          editMode={editMode}

          baseConfig={baseConfig}
          networkConfig={networkOverrideConfig}
          nodeConfig={nodeOverrideConfig}
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
  nodeOverrideConfig: React.PropTypes.object.isRequired,
}
