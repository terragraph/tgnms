/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfigLeftPane.js
// the left pane of the network config view, allows users to select either the entire network
// or one or more nodes to view the config

import {changeEditMode} from '../../actions/NetworkConfigActions.js';
import {CONFIG_VIEW_MODE} from '../../constants/NetworkConfigConstants.js';
import NetworkConfigImageSelector from './NetworkConfigImageSelector.js';
import NetworkConfigLegend from './NetworkConfigLegend.js';
import NetworkConfigNodes from './NetworkConfigNodes.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';

export default class NetworkConfigLeftPane extends React.Component {
  static propTypes = {
    topologyName: PropTypes.string.isRequired,
    selectedImage: PropTypes.string.isRequired,

    editMode: PropTypes.string.isRequired,
    networkDraftExists: PropTypes.bool.isRequired,

    imageVersions: PropTypes.array.isRequired,

    nodes: PropTypes.array.isRequired,
    selectedNodes: PropTypes.array.isRequired,
    nodesWithDrafts: PropTypes.array.isRequired,
    nodesWithOverrides: PropTypes.instanceOf(Set).isRequired,
    removedNodeOverrides: PropTypes.object.isRequired,
  };

  state = {
    legendHeight: 0,
  };

  leftPaneRef = React.createRef();

  renderViewModeSelector() {
    const {editMode, networkDraftExists, nodesWithDrafts} = this.props;

    const unsavedMarker = (
      <img height="20" src="/static/images/bullet_red.png" />
    );

    return (
      <div className="nc-view-select">
        <div
          className={classNames('nc-view-option', {
            'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NETWORK,
          })}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NETWORK})}>
          <p>Network{networkDraftExists && unsavedMarker}</p>
        </div>
        <div
          className={classNames('nc-view-option', {
            'nc-view-option-selected': editMode === CONFIG_VIEW_MODE.NODE,
          })}
          onClick={() => changeEditMode({editMode: CONFIG_VIEW_MODE.NODE})}>
          <p>Node{nodesWithDrafts.length > 0 && unsavedMarker}</p>
        </div>
      </div>
    );
  }

  render() {
    const {
      nodes,
      selectedNodes,
      editMode,
      nodesWithDrafts,
      nodesWithOverrides,
      removedNodeOverrides,
      imageVersions,
      selectedImage,
    } = this.props;
    const viewModeSelector = this.renderViewModeSelector();

    // styling hack to fill the remaining space
    const spacerDiv = <div style={{flex: 1}} />;

    return (
      <div className="rc-config-left-pane">
        {viewModeSelector}
        <div
          className={
            editMode === CONFIG_VIEW_MODE.NETWORK ? 'body-padding' : null
          }>
          {editMode === CONFIG_VIEW_MODE.NODE && (
            <NetworkConfigNodes
              legendHeight={this.state.legendHeight}
              nodes={nodes}
              nodesWithDrafts={nodesWithDrafts}
              nodesWithOverrides={nodesWithOverrides}
              removedNodeOverrides={removedNodeOverrides}
              selectedNodes={selectedNodes}
            />
          )}
          {editMode === CONFIG_VIEW_MODE.NETWORK && (
            <div className="selector-title">Select Base Version</div>
          )}
          {editMode === CONFIG_VIEW_MODE.NETWORK && (
            <NetworkConfigImageSelector
              imageVersions={imageVersions}
              selectedImage={selectedImage}
            />
          )}
        </div>
        {editMode === CONFIG_VIEW_MODE.NETWORK && spacerDiv}
        <NetworkConfigLegend
          editMode={editMode}
          onUpdate={height => this.setState({legendHeight: height})}
        />
      </div>
    );
  }
}
