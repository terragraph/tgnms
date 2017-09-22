import React from 'react';
import { render } from 'react-dom';

import Dispatcher from '../../NetworkDispatcher.js';
import { Actions } from '../../NetworkConstants.js';


export default class UpgradeCommandPane extends React.Component {
  constructor(props) {
    super(props);
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

  render() {
    return (
      <div className="upgrade-command-pane">
        <button className='upgrade-btn'>Launch Server</button>
        <button className='upgrade-btn' onClick={this.prepareUpgrade}>Prepare</button>
        <button className='upgrade-btn' onClick={this.commitUpgrade}>Commit</button>
        <button className='upgrade-btn'>Abort</button>
      </div>
    );
  }
}
