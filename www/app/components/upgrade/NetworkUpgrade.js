import React from 'react';
import { render } from 'react-dom';

import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import UpgradeCommandPane from './UpgradeCommandPane.js';
import UpgradeMonitor from './UpgradeMonitor.js';

export default class NetworkUpgrade extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    // console.log('networkupgrade', this.props);
    const {networkConfig, upgradeStateDump} = this.props;
    const {topology} = networkConfig;

    // curUpgradeReq?
    let curBatch = (!!upgradeStateDump && upgradeStateDump.hasOwnProperty('curBatch'))
      ? upgradeStateDump.curBatch : [];

    let pendingBatches = (!!upgradeStateDump && upgradeStateDump.hasOwnProperty('pendingBatches'))
      ? upgradeStateDump.pendingBatches : [];

    // console.log('UPGRADE STATUS DUMP CURREQ', curUpgradeReq);
    console.log('UPGRADE STATUS DUMP CURBATCH', curBatch);
    console.log('UPGRADE STATUS DUMP PENDBATCH', pendingBatches);


    return (
      <div className="network-upgrade">
        {/* status dump and map view coming soon */}
        <UpgradeCommandPane
          nodes={this.props.upgradeNodes}
        />
        <UpgradeMonitor
          topology={topology}
          curBatch={curBatch}
          pendingBatches={pendingBatches}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
  upgradeNodes: React.PropTypes.array.isRequired,
  upgradeStateDump: React.PropTypes.object.isRequired,
}
