import React from 'react';
import { render } from 'react-dom';

import UpgradeNodesTable from './UpgradeNodesTable.js';
// import { availabilityColor } from '../../NetworkHelper.js';
// import { Actions } from '../../NetworkConstants.js';
// import Dispatcher from '../../NetworkDispatcher.js';
// import NetworkStore from '../../NetworkStore.js';
// import ReactEventChart from '../../ReactEventChart.js';

export default class UpgradeMonitor extends React.Component {


  render() {
    const {topology, upgradeState} = this.props;

    return (
      <div className='rc-upgrade-monitor'>
        <UpgradeNodesTable
          height={900}
          width={2000}
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
