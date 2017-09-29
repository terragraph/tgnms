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
    const {topology, upgradeState} = this.props.networkConfig;

    return (
      <div className="network-upgrade">
        {/* status dump and map view coming soon */}
        <UpgradeCommandPane
          nodes={this.props.upgradeNodes}
        />
        <UpgradeMonitor
          topology={topology}
          upgradeState={upgradeState}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
  upgradeNodes: React.PropTypes.array,
}
