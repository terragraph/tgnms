import React from 'react';
import { render } from 'react-dom';

import UpgradeNodesTable from './UpgradeNodesTable.js';


export default class UpgradeMonitor extends React.Component {
  render() {
    const {topology, upgradeState} = this.props;

    return (
      <div className='rc-upgrade-monitor'>
        <div className='upgrade-monitor-row'>
          <label>Node upgrade status (select nodes for upgrade)</label>
          <UpgradeNodesTable
            topology={topology}
          />
        </div>
      </div>
    );
  }
}

UpgradeMonitor.propTypes = {
  topology: React.PropTypes.object.isRequired,
  upgradeState: React.PropTypes.object.isRequired,
}
