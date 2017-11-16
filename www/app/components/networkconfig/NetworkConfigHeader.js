// NetworkConfigHeader.js
import React from 'react';
import { render } from 'react-dom';

import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

import { CONFIG_VIEW_MODE, CONFIG_CLASSNAMES } from '../../constants/NetworkConfigConstants.js';
import { refreshConfig } from '../../actions/NetworkConfigActions.js';

const refreshAlertProps = {
  title: 'Refresh Configuration?',
  text: `You are about to fetch the latest configuration for both network and node overrides.
  This will discard any unsaved changes you have.

  Proceed?`,
  type: 'warning',
  showCancelButton: true,
  confirmButtonText: 'Refresh',
  cancelButtonText: 'Cancel'
};

export default class NetworkConfigHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  onRefresh = () => {
    if (this.props.hasUnsavedChanges) {
      swal(refreshAlertProps, (isConfirm) => {
        if (isConfirm) {
          refreshConfig();
        }
      });
    } else {
      refreshConfig();
    }
  }

  render() {
    const {editMode, selectedNodes} = this.props;
    const editModeText = (editMode === CONFIG_VIEW_MODE.NODE) ? 'Node' : 'Network';
    const titleText = `View/Edit ${editModeText} Override`;

    // TODO: Kelvin: not sure what to display for multiple nodes
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
        <div className='nc-header-refresh-wrapper'>
          <img
            className='nc-header-refresh'
            src='/static/images/refresh.png'
            title='Refresh Config'
            onClick={this.onRefresh}
          />
        </div>
      </div>
    );
  }
}

NetworkConfigHeader.propTypes = {
  editMode: React.PropTypes.string.isRequired,
  selectedNodes: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  hasUnsavedChanges: React.PropTypes.bool.isRequired,
}
