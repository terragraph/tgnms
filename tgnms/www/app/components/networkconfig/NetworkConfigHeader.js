/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// NetworkConfigHeader.js
import 'sweetalert/dist/sweetalert.css';

import {refreshConfig} from '../../actions/NetworkConfigActions.js';
import {
  CONFIG_VIEW_MODE,
  CONFIG_CLASSNAMES,
} from '../../constants/NetworkConfigConstants.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import React from 'react';
import swal from 'sweetalert';

const refreshAlertProps = {
  title: 'Refresh Configuration?',
  text: `Fetching the latest configuration will discard any unsaved changes you have.

  Proceed?`,
  type: 'warning',
  showCancelButton: true,
  confirmButtonText: 'Refresh',
  cancelButtonText: 'Cancel',
};

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  onRefresh = () => {
    if (this.props.hasUnsavedChanges) {
      swal(refreshAlertProps, isConfirm => {
        if (isConfirm) {
          refreshConfig();
        }
      });
    } else {
      refreshConfig();
    }
  };

  _trimVersionString(v) {
    const prefix = 'Facebook Terragraph Release ';
    return v.indexOf(prefix) >= 0 ? v.substring(prefix.length) : v;
  }

  render() {
    const {editMode, selectedNodes} = this.props;
    const editModeText =
      editMode === CONFIG_VIEW_MODE.NODE ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    // TODO: Kelvin: not sure what to display for multiple nodes
    let nodeStatusText = '';
    if (editMode === CONFIG_VIEW_MODE.NODE) {
      nodeStatusText = selectedNodes[0].ignited ? (
        <span className="nc-header-text">
          <strong>Version: </strong>
          <em>{this._trimVersionString(selectedNodes[0].imageVersion)}</em>
          {selectedNodes[0].hwBoardId !== null && <br />}
          {selectedNodes[0].hwBoardId !== null && (
            <span>
              <strong>Hardware: </strong>
              <em>{selectedNodes[0].hwBoardId}</em>
            </span>
          )}
        </span>
      ) : (
        <span style={{color: '#990000'}}>
          Node is offline
          <br />
          <em>The base configuration shown may be inaccurate</em>
        </span>
      );
    }

    return (
      <div className="rc-config-header">
        <h3 className="nc-header-title">{titleText}</h3>
        {nodeStatusText}
        <div className="nc-header-refresh-wrapper">
          <img
            className="nc-header-refresh"
            src="/static/images/refresh.png"
            title="Refresh Config"
            onClick={this.onRefresh}
          />
        </div>
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: PropTypes.string.isRequired,
  selectedNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  hasUnsavedChanges: PropTypes.bool.isRequired,
};
