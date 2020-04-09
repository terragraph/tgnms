/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import BatchUpgradeTable from './BatchUpgradeTable';
import NetworkContext from '../../contexts/NetworkContext';
import NodeUpgradeTable from './NodeUpgradeTable';
import React from 'react';
import UpgradeOperationsToolbar from './UpgradeOperationsToolbar';
import {UpgradeStatusToString} from '../../constants/UpgradeConstants';
import {isNodeAlive} from '../../helpers/NetworkHelpers';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

export type StructuredNodeType = {|
  name: string,
  alive: boolean,
  siteName: string,
  popNode: boolean,
  upgradeStatus: ?string,
  upgradeStatusReason: ?string,
  version: ?string,
  nextVersion: ?string,
|};

export type StructuredBatchType = {|
  name: string,
  upgradeStatus: ?string,
  upgradeReqId: ?string,
  version: ?string,
  nextVersion: ?string,
|};

const styles = theme => ({
  root: {
    flexGrow: 1,
    padding: theme.spacing(),
    overflow: 'auto',
  },
});

type Props = {
  classes: Object,
};

class NetworkUpgrade extends React.Component<Props> {
  structureNodeData = (nodes, statusReports): Array<StructuredNodeType> => {
    // For the given list of nodes, populate fields needed in NodeUpgradeTable
    return nodes.map(node => {
      const statusReport = statusReports?.[node.mac_addr];
      const upgradeStatus = statusReport?.upgradeStatus;

      return {
        name: node.name,
        alive: isNodeAlive(node.status),
        siteName: node.site_name,
        popNode: node.pop_node,
        upgradeStatus: UpgradeStatusToString[upgradeStatus?.usType],
        upgradeStatusReason: upgradeStatus?.reason,
        version: statusReport?.version,
        nextVersion: upgradeStatus?.nextImage?.version,
      };
    });
  };

  structureBatchData = (nodes, statusReports): Array<StructuredBatchType> => {
    // For the given list of nodes, populate fields needed in BatchUpgradeTable
    return nodes.map(node => {
      const statusReport = statusReports?.[node.mac_addr];
      const upgradeStatus = statusReport?.upgradeStatus;

      return {
        name: node.name,
        upgradeStatus: UpgradeStatusToString[upgradeStatus?.usType],
        upgradeReqId: upgradeStatus?.upgradeReqId,
        version: statusReport?.version,
        nextVersion: upgradeStatus?.nextImage?.version,
      };
    });
  };

  render() {
    return (
      <NetworkContext.Consumer>{this.renderContext}</NetworkContext.Consumer>
    );
  }

  renderContext = context => {
    const {classes} = this.props;

    // Extract topology info from the NetworkContext
    const {networkName, networkConfig, nodeMap} = context;
    const {topology, status_dump, upgrade_state} = networkConfig;
    const {statusReports} = status_dump;

    // Map node names (in current/pending batches) to their node structs
    const curBatch = upgrade_state.curBatch
      .filter(nodeName => nodeMap.hasOwnProperty(nodeName))
      .map(nodeName => nodeMap[nodeName]);
    const pendingBatches = [].concat(
      ...upgrade_state.pendingBatches.map(nodeBatch =>
        nodeBatch
          .filter(nodeName => nodeMap.hasOwnProperty(nodeName))
          .map(nodeName => nodeMap[nodeName]),
      ),
    );

    return (
      <div className={classes.root}>
        <UpgradeOperationsToolbar
          currentRequest={
            upgrade_state.curReq.urReq.upgradeReqId
              ? upgrade_state.curReq
              : null
          }
          pendingRequests={upgrade_state.pendingReqs}
          networkName={networkName}
        />
        <NodeUpgradeTable
          controllerVersion={networkConfig.controller_version}
          data={this.structureNodeData(topology.nodes, statusReports)}
          networkName={networkName}
        />
        <BatchUpgradeTable
          data={this.structureBatchData(curBatch, statusReports)}
          title="Nodes in Current Upgrade Batch"
        />
        <BatchUpgradeTable
          data={this.structureBatchData(pendingBatches, statusReports)}
          title="Nodes Pending Upgrade"
        />
      </div>
    );
  };
}

export default withStyles(styles)(withRouter(NetworkUpgrade));
