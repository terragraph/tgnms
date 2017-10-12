import React from 'react';
import { render } from 'react-dom';

import UpgradeNodesTable from './UpgradeNodesTable.js';
import UpgradeBatchTable from './UpgradeBatchTable.js';

import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

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

  onNodesSelected = (nodes) => {
    Dispatcher.dispatch({
      actionType: Actions.UPGRADE_NODES_SELECTED,
      nodes,
    });
  }

  render() {
    const {topology, selectedNodes, curBatch, pendingBatches} = this.props;
    // const pendingBatchNodes = this.flattenPendingBatches(pendingBatches);

    const nodes = topology && topology.nodes ? topology.nodes : [];

    const pendingBatchNodes = this.flattenPendingBatches([nodes, nodes, nodes]);
    return (
      <div className='rc-upgrade-monitor'>
        <div className='upgrade-monitor-row'>
          <label>Node upgrade status (select nodes for upgrade)</label>
          <UpgradeNodesTable
            nodes={nodes}
            selectedNodes={selectedNodes}
            onNodesSelected={this.onNodesSelected}
          />
        </div>
        <div className='upgrade-monitor-row'>
          <label>Nodes in current upgrade batch</label>
          <UpgradeBatchTable
            nodes={nodes}
            height={300}
            pendingBatch={false}
          />
        </div>
        <div className='upgrade-monitor-row'>
          <label>Nodes pending upgrade</label>
          <UpgradeBatchTable
            nodes={pendingBatchNodes}
            height={700}
            pendingBatch={true}
          />
        </div>
      </div>
    );
  }
}

UpgradeMonitor.propTypes = {
  topology: React.PropTypes.object.isRequired,
  selectedNodes: React.PropTypes.array.isRequired,
  curBatch: React.PropTypes.array.isRequired,
  pendingBatches: React.PropTypes.array.isRequired,
}
