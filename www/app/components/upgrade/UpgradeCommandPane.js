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
    swal({
      title: "Functionality not supported",
      text: `Sorry, launching an image hosting server is not supported right now on NMS.
      Please use these commands in a terminal instead:

      tg upgrade launch_server -i <path to your image file>

      This will return a URL where your image will be hosted.
      `,
      type: "info"
    });
  }

  prepareUpgrade() {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_PREPARE_UPGRADE_MODAL,
    });
  }

  commitUpgrade() {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_COMMIT_UPGRADE_MODAL,
    });
  }

  abortUpgrade() {
    swal({
      title: `Functionality not supported`,
      text: `To abort an upgrade in progress, use the command:
      tg upgrade abort -r <list of request ids to abort, separated by commas>`,
      type: "info"
    })
  }

  render() {
    return (
      <div className="upgrade-command-pane">
        <button className='upgrade-btn' onClick={this.launchUpgradeServer}>Launch Server</button>
        <button className='upgrade-btn' onClick={this.prepareUpgrade}>Prepare</button>
        <button className='upgrade-btn' onClick={this.commitUpgrade}>Commit</button>
        <button className='upgrade-btn' onClick={this.abortUpgrade}>Abort</button>
      </div>
    );
  }
}
