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
      baseConfig
    } = this.props;

    return (
      <div className='rc-network-config'>
        <NetworkConfigLeftPane
          topologyName={topologyName}
          nodes={nodes}
          selectedNodes={selectedNodes}
        />
        <NetworkConfigBody
          baseConfig={baseConfig}
        />
        {/* <NetworkConfigLeftPane
        />
        <NetworkConfigBody
        /> */}
      </div>
    );
  }
}

NetworkConfig.propTypes = {
  topologyName: React.PropTypes.string.isRequired,
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,

  baseConfig: React.PropTypes.object.isRequired,
}
