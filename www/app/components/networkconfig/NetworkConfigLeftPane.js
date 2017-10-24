// NetworkConfigLeftPane.js
// the left pane of the network config view, allows users to select either the entire network
// or one or more nodes to view the config

import React from 'react';
import { render } from 'react-dom';

export default class NetworkConfigLeftPane extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className='rc-network-config-left-pane'>
        you just lost the game
      </div>
    );
  }
}

NetworkConfigLeftPane.propTypes = {
  topologyName: React.PropTypes.string.isRequired,
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
}
