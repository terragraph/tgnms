import React from 'react';
import { render } from 'react-dom';

import UpgradeNodesTable from './UpgradeNodesTable.js';


export default class UpgradeMonitor extends React.Component {
  render() {
    const {topology, upgradeState} = this.props;

    return (
      <div className='rc-upgrade-monitor'>
        <UpgradeNodesTable
          height={900}
          topology={topology}
        />
      </div>
    );
  }
}

UpgradeMonitor.propTypes = {
  topology: React.PropTypes.object.isRequired,
  upgradeState: React.PropTypes.object.isRequired,
}
