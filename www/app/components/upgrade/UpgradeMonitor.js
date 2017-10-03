import React from 'react';
import { render } from 'react-dom';

import UpgradeNodesTable from './UpgradeNodesTable.js';
import UpgradeBatchTable from './UpgradeBatchTable.js';

export default class UpgradeMonitor extends React.Component {
  constructor(props) {
    super(props);
  }

  flattenPendingBatches(pendingBatches) {
    // flatten the list of node batches into a single list of nodes
    // then associate each node with the batch it belongs to (batchIdx)
    return pendingBatches.reduce((pendingNodes, batch, batchIdx) => {
      return pendingNodes.concat(
        batch.map(nodeInBatch => Object.assign({}, nodeInBatch, {batchIdx}))
      );
    }, []);
  }

  render() {
    const {topology, curBatch, pendingBatches} = this.props;
    const pendingBatchNodes = this.flattenPendingBatches(pendingBatches);

    return (
      <div className='rc-upgrade-monitor'>
        <div className='upgrade-monitor-row'>
          <label>Node upgrade status (select nodes for upgrade)</label>
          <UpgradeNodesTable
            topology={topology}
          />
        </div>
        <div className='upgrade-monitor-row'>
          <label>Nodes in current upgrade batch</label>
          <UpgradeBatchTable
            nodes={curBatch}
            height={300}
          />
        </div>
        <div className='upgrade-monitor-row'>
          <label>Nodes pending upgrade</label>
          <UpgradeBatchTable
            nodes={pendingBatchNodes}
            height={700}
          />
        </div>
      </div>
    );
  }
}

UpgradeMonitor.propTypes = {
  topology: React.PropTypes.object.isRequired,

  curBatch: React.PropTypes.array.isRequired,
  pendingBatches: React.PropTypes.array.isRequired,
}
