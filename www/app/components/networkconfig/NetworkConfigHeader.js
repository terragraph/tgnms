// NetworkConfigHeader.js
import React from 'react';
import { render } from 'react-dom';

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {editMode, selectedNodes} = this.props;
    const editModeText = (editMode === CONFIG_VIEW_MODE.NODE) ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    // hack: not sure what to display for multiple nodes
    // maybe color the node status differently in the left pane?
    let nodeStatusText = '';
    if (editMode === CONFIG_VIEW_MODE.NODE) {
      nodeStatusText = selectedNodes[0].ignited ? (
        <span style={{color: '#009900'}}>Node is Online running: <strong>{selectedNodes[0].imageVersion}</strong></span>
      ) : (
        <span style={{color: '#990000'}}>Node is Offline</span>
      );
    }

    return (
      <div className='rc-network-config-header'>
        <h3 className='nc-header-title'>{titleText}</h3>
        {nodeStatusText}
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: React.PropTypes.string.isRequired,
  selectedNodes: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
}
