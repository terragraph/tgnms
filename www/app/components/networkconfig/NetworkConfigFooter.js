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
  // TODO: changed nodes/selected nodes/all nodes mode!
  onSubmitConfig = () => {
    const {networkConfig, nodeConfig, editMode} = this.props;
    if (editMode === CONFIG_VIEW_MODE.NODE) {
      setNodeOverrideConfig(nodeConfig);
    } else {
      setNetworkOverrideConfig(networkConfig);
    }
  }

  onSubmitConfigForAllNodes = () => {
    const {nodeConfig} = this.props;
    setNodeOverrideConfig(nodeConfig);
  }

  onResetConfig = () => {
    resetConfig();
  }

  onResetAllConfig = () => {
    resetConfigForAllNodes();
  }

  // TODO: 4 button system for phase 1
  render() {
    const {draftConfig, networkConfig, nodeConfig, editMode} = this.props;

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
            disabled={Object.keys(draftConfig).length === 0}
          >Submit changes for all nodes</button>
        }
      </div>
    );
  }
}

NetworkConfigFooter.propTypes = {
  draftConfig: React.PropTypes.object.isRequired,
  networkConfig: React.PropTypes.object.isRequired,
  nodeConfig: React.PropTypes.object.isRequired,
  editMode: React.PropTypes.string.isRequired,
}
