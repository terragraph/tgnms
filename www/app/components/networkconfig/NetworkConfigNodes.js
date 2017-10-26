// NetworkConfigNodes.js
// list of nodes + a search bar

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode, selectNodes} from '../../actions/NetworkConfigActions.js';

// export default class

export default class NetworkConfigNodes extends React.Component {
  constructor(props) {
    super(props);
  }

  selectNode = (node) => {
    selectNodes({
      nodes: [node]
    });
  }

  renderNodeList = () => {
    const {nodes, selectedNodes} = this.props;
    const selectedNodeNames = new Set(selectedNodes);

    // TODO: filter
    return nodes.map((node) => {
      return (
        <li
          className={classNames(
            'nc-node',
            {'nc-node-selected': selectedNodeNames.has(node)}
          )}
          onClick={() => this.selectNode(node)}
        >
          {node}
        </li>
      );
    });
  }

  render() {
    const {nodes, selectedNodes} = this.props;

    return (
      <div className='rc-network-config-nodes'>
        <ul>
          {this.renderNodeList()}
        </ul>
      </div>
    );
  }
}

NetworkConfigNodes.propTypes = {
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
}
