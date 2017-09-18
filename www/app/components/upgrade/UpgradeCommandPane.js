import React from 'react';
import { render } from 'react-dom';

import Dispatcher from '../../NetworkDispatcher.js';
import { Actions } from '../../NetworkConstants.js';
// import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
// import ipaddr from 'ipaddr.js';

// import { prepareUpgrade } from '../../apiutils/upgradeAPIUtil.js';

export default class UpgradeCommandPane extends React.Component {
  constructor(props) {
    super(props);
  }

  // test API hook function
  onClick() {
    console.log('test hookup to API');
    prepareUpgrade({
      asdf: "I guess this works?"
    });
  }

  prepareUpgrade() {
    console.log('preparing upgrade');
    Dispatcher.dispatch({
      actionType: Actions.OPEN_PREPARE_UPGRADE_MODAL,
    });
    // dispatch
  }

  commitUpgrade() {
    console.log('committing upgrade');
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
        <button className='abort-btn'>Abort</button>
      </div>
    );
  }
}
