import React from 'react';
import { render } from 'react-dom';

import {
  submitConfig,
  submitConfigForAllNodes,
  resetConfig,
  resetConfigForAllNodes
} from '../../actions/NetworkConfigActions.js';

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigFooter extends React.Component {
  constructor(props) {
    super(props);
  }

  onSubmitConfig = () => {
    submitConfig();
  }

  onSubmitConfigForAllNodes = () => {
    submitConfigForAllNodes();
  }

  onResetConfig = () => {
    resetConfig();
  }

  onResetAllConfig = () => {
    resetConfigForAllNodes();
  }

  // TODO: 4 button system for phase 1
  render() {
    const {draftConfig, editMode} = this.props;

    return (
      <div className='rc-network-config-footer'>
        <button className='nc-footer-btn' onClick={this.onResetConfig}>Discard Changes</button>
        {editMode === CONFIG_VIEW_MODE.NODE &&
          <button className='nc-footer-btn' onClick={this.onResetAllConfig}>Discard changes for all nodes</button>
        }
        <button
          className='nc-footer-btn'
          onClick={this.onSubmitConfig}
          disabled={Object.keys(draftConfig).length === 0}
        >Submit Changes</button>
        {editMode === CONFIG_VIEW_MODE.NODE &&
          <button
            className='nc-footer-btn'
            onClick={this.onSubmitConfigForAllNodes}
          >Submit changes for all nodes</button>
        }
      </div>
    );
  }
}

NetworkConfigFooter.propTypes = {
  draftConfig: React.PropTypes.object.isRequired,
  editMode: React.PropTypes.string.isRequired,
}
