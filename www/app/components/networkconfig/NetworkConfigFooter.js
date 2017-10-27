// NetworkConfigBody.js
// contains the component to render a config JSON, and buttons to save/save draft

import React from 'react';
import { render } from 'react-dom';

import {
  setNetworkOverrideConfig,
  setNodeOverrideConfig,
} from '../../apiutils/NetworkConfigAPIUtil.js';
import {resetConfig, resetConfigForAllNodes} from '../../actions/NetworkConfigActions.js';

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';

export default class NetworkConfigFooter extends React.Component {
  constructor(props) {
    super(props);
  }

  // send the API calls here instead of dispatching an action to NetworkConfigContainer
  // this is done to avoid dispathcing while in the middle of a dispatch
  // this is also why the draftConfig and editMode props are needed
  onSubmitConfig = () => {
    const {draftConfig, editMode} = this.props;
    if (Object.keys(draftConfig).length === 0) {
      return;
    }

    if (editMode === CONFIG_VIEW_MODE.NODE) {
      setNodeOverrideConfig(draftConfig);
    } else {
      setNetworkOverrideConfig(draftConfig);
    }
  }

  onResetConfig = () => {
    resetConfig();
  }

  onResetAllConfig = () => {
    resetConfigForAllNodes();
  }

  // TODO: add other config objects in the config form besides the base config
  render() {
    const {editMode} = this.props;
    const revertText = editMode === CONFIG_VIEW_MODE.NODE ? 'Revert Selected Nodes' : 'Revert Network Override';

    return (
      <div className='rc-network-config-footer'>
        <button className='nc-footer-btn' onClick={this.onResetConfig}>{revertText}</button>
        {editMode === CONFIG_VIEW_MODE.NODE &&
          <button className='nc-footer-btn' onClick={this.onResetAllConfig}>Revert All Nodes</button>
        }
        <button className='nc-footer-btn' onClick={this.onSubmitConfig}>Push Changes</button>
      </div>
    );
  }
}

NetworkConfigFooter.propTypes = {
  draftConfig: React.PropTypes.object.isRequired,
  editMode: React.PropTypes.string.isRequired,
}
