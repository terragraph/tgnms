import React from 'react';
import { render } from 'react-dom';
import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

import Dispatcher from '../../NetworkDispatcher.js';
import { Actions } from '../../NetworkConstants.js';


export default class UpgradeCommandPane extends React.Component {
  constructor(props) {
    super(props);
  }

  launchUpgradeServer() {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_UPGRADE_BINARY_MODAL,
    });
  }

  prepareUpgrade = () => {
    const {selectedNodes} = this.props;
    if (selectedNodes.length > 0) {
      Dispatcher.dispatch({
        actionType: Actions.OPEN_PREPARE_UPGRADE_MODAL,
      });
    } else {
      swal({
        title: 'No Nodes Selected',
        text: `Please select some nodes to upgrade in the table before proceeding`,
        type: 'error'
      });
    }
  }

  commitUpgrade = () => {
    const {selectedNodes} = this.props;
    if (selectedNodes.length > 0) {
      Dispatcher.dispatch({
        actionType: Actions.OPEN_COMMIT_UPGRADE_MODAL,
      });
    } else {
      swal({
        title: 'No Nodes Selected',
        text: `Please select some nodes to upgrade in the table before proceeding`,
        type: 'error'
      });
    }
  }

  abortUpgrade = () => {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_ABORT_UPGRADE_MODAL,
    });
  }

  render() {
    return (
      <div className='upgrade-command-pane'>
        <button className='upgrade-btn' onClick={this.launchUpgradeServer}>Manage Upgrade Images</button>
        <button className='upgrade-btn' onClick={this.prepareUpgrade}>Prepare</button>
        <button className='upgrade-btn' onClick={this.commitUpgrade}>Commit</button>
        <button className='upgrade-btn' onClick={this.abortUpgrade}>Abort</button>
      </div>
    );
  }
}

// pass node props in here so we can pass them as an action or show an alert telling the user to select nodes
UpgradeCommandPane.propTypes = {
  selectedNodes: React.PropTypes.array.isRequired
}
