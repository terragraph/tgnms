import React from 'react';
import { render } from 'react-dom';
import UpgradeCommandPane from './UpgradeCommandPane.js';
import UpgradeMonitor from './UpgradeMonitor.js';

export default class NetworkUpgrade extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    console.log('networkupgrade', this.props);
    const {topology, upgradeState} = this.props.networkConfig;

    return (
      <div className="network-upgrade">
        {/* status dump and map view coming soon */}
        <UpgradeCommandPane />
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
}
