// NetworkConfigLeftPane.js
// the left pane of the network config view, allows users to select either the entire network
// or one or more nodes to view the config

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode} from '../../actions/NetworkConfigActions.js';

import NetworkConfigNodes from './NetworkConfigNodes.js';

export default class NetworkConfigLeftPane extends React.Component {
  constructor(props) {
    super(props);
  }

  renderViewModeSelector = () => {
    const {editMode} = this.props;

    return (
      <div className='nc-view-select'>
        <div
          className={classNames(
            'nc-view-option',
            {'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NETWORK}
          )}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NETWORK})}
        >
          <p>Network</p>
        </div>
        <div
          className={classNames(
            'nc-view-option',
            {'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NODE}
          )}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NODE})}
        >
          <p>Node</p>
        </div>
      </div>
    );
  }

  render() {
    const {nodes, selectedNodes, editMode} = this.props;
    const viewModeSelector = this.renderViewModeSelector();

    return (
      <div className='rc-network-config-left-pane'>
        {viewModeSelector}
        {editMode === CONFIG_VIEW_MODE.NODE &&
          <NetworkConfigNodes
            nodes={nodes}
            selectedNodes={selectedNodes}
          />
        }
      </div>
    );
  }
}

NetworkConfigLeftPane.propTypes = {
  topologyName: React.PropTypes.string.isRequired,

  editMode: React.PropTypes.string.isRequired,
  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
}
