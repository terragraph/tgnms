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

  render() {
    const {editMode, selectedNodes} = this.props;
    const editModeText =
      editMode === CONFIG_VIEW_MODE.NODE ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    // TODO: Kelvin: not sure what to display for multiple nodes
    let nodeStatusText = '';
    if (editMode === CONFIG_VIEW_MODE.NODE) {
      nodeStatusText = selectedNodes[0].ignited ? (
        <span style={{color: '#009900'}}>
          Node is Online running:{' '}
          <strong>{selectedNodes[0].imageVersion}</strong>
        </span>
      ) : (
        <span style={{color: '#990000'}}>Node is Offline</span>
      );
    }

    return (
      <div className="rc-network-config-header">
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
