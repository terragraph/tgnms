// NetworkConfigLeftPane.js
// the left pane of the network config view, allows users to select either the entire network
// or one or more nodes to view the config

import React from 'react';
import { render } from 'react-dom';

const classNames = require('classnames');
var _ = require('lodash');

import { CONFIG_VIEW_MODE } from '../../constants/NetworkConfigConstants.js';
import {changeEditMode} from '../../actions/NetworkConfigActions.js';

import NetworkConfigImageSelector from './NetworkConfigImageSelector.js';
import NetworkConfigNodes from './NetworkConfigNodes.js';
import NetworkConfigLegend from './NetworkConfigLegend.js';


export default class NetworkConfigLeftPane extends React.Component {
  constructor(props) {
    super(props);
  }

  renderViewModeSelector = () => {
    const {editMode, networkDraftExists, nodesWithDrafts} = this.props;

    const unsavedMarker = (
      <img height='20' src='/static/images/bullet_red.png'/>
    );

    return (
      <div className='nc-view-select'>
        <div
          className={classNames(
            'nc-view-option',
            {'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NETWORK}
          )}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NETWORK})}
        >
          <p>Network{networkDraftExists && unsavedMarker}</p>
        </div>
        <div
          className={classNames(
            'nc-view-option',
            {'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NODE}
          )}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NODE})}
        >
          <p>Node{nodesWithDrafts.length > 0 && unsavedMarker}</p>
        </div>
      </div>
    );
  }

  render() {
    const {nodes, selectedNodes, editMode, nodesWithDrafts, nodeOverrideConfig, imageVersions, selectedImage} = this.props;
    const viewModeSelector = this.renderViewModeSelector();

    // TODO: move this to NetworkConfig.js
    const nodesWithOverrides = _.isPlainObject(nodeOverrideConfig) ?
      new Set(
        Object.keys(nodeOverrideConfig).filter((node) => {
          return (_.isPlainObject(nodeOverrideConfig[node]) && Object.keys(nodeOverrideConfig[node]).length > 0);
        })
      ) : new Set();

    // styling hack to fill the remaining space
    const spacerDiv = (<div style={{flex: 1}}></div>);

    return (
      <div className='rc-network-config-left-pane'>
        {viewModeSelector}
        {editMode === CONFIG_VIEW_MODE.NODE &&
          <NetworkConfigNodes
            nodes={nodes}
            selectedNodes={selectedNodes}
            nodesWithDrafts={nodesWithDrafts}
            nodesWithOverrides={nodesWithOverrides}
          />
        }
        {editMode === CONFIG_VIEW_MODE.NETWORK &&
          <NetworkConfigImageSelector
            imageVersions={imageVersions}
            selectedImage={selectedImage}
          />
        }
        {editMode === CONFIG_VIEW_MODE.NETWORK && spacerDiv}
        <NetworkConfigLegend
          editMode={editMode}
        />
      </div>
    );
  }
}

NetworkConfigLeftPane.propTypes = {
  topologyName: React.PropTypes.string.isRequired,
  selectedImage: React.PropTypes.string.isRequired,

  editMode: React.PropTypes.string.isRequired,
  networkDraftExists: React.PropTypes.bool.isRequired,

  imageVersions: React.PropTypes.array.isRequired,

  nodes: React.PropTypes.array.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
  nodesWithDrafts: React.PropTypes.array.isRequired,
  nodeOverrideConfig: React.PropTypes.object.isRequired,
}
