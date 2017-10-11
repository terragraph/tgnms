import React from 'react';
import { render } from 'react-dom';

import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import UpgradeCommandPane from './UpgradeCommandPane.js';
import UpgradeMonitor from './UpgradeMonitor.js';

import ModalPrepareUpgrade from './ModalPrepareUpgrade.js';
import ModalCommitUpgrade from './ModalCommitUpgrade.js';
import ModalUpgradeBinary from './ModalUpgradeBinary.js';

const UPGRADE_OPERATIONS = {
  'BINARY':   'binary',
  'PREPARE':  'prepare',
  'COMMIT':   'commit',
  'ABORT':    'abort',
};

export default class NetworkUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    this.state = {
      selectedNodesForUpgrade: [],
      upgradeModalOpen: false,
      upgradeModalMode: UPGRADE_OPERATIONS.PREPARE,
    }
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.UPGRADE_NODES_SELECTED:
        this.setState({
          selectedNodesForUpgrade: payload.nodes
        });
        break;
      case Actions.OPEN_UPGRADE_BINARY_MODAL:
        this.setState({
          upgradeModalOpen: true,
          upgradeModalMode: UPGRADE_OPERATIONS.BINARY,
        });
        break;
      case Actions.OPEN_PREPARE_UPGRADE_MODAL:
        this.setState({
          upgradeModalOpen: true,
          upgradeModalMode: UPGRADE_OPERATIONS.PREPARE,
        });
        break;
      case Actions.OPEN_COMMIT_UPGRADE_MODAL :
        this.setState({
          upgradeModalOpen: true,
          upgradeModalMode: UPGRADE_OPERATIONS.COMMIT,
        });
        break;
      default:
        break;
    }
  }

  renderUpgradeModal = () => {
    const {networkConfig} = this.props;

    let upgradeNetworkModal = <div/>;
    switch (this.state.upgradeModalMode) {
      case UPGRADE_OPERATIONS.BINARY:
        upgradeNetworkModal = (
          <ModalUpgradeBinary
            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}
          />
        );
        break;
      case UPGRADE_OPERATIONS.PREPARE:
        upgradeNetworkModal = (
          <ModalPrepareUpgrade
            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}
            upgradeNodes={this.state.selectedNodesForUpgrade}
            upgradeState={networkConfig.upgradeState}
          />);
        break;
      case UPGRADE_OPERATIONS.COMMIT:
        upgradeNetworkModal = (
          <ModalCommitUpgrade
            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}
            upgradeNodes={this.state.selectedNodesForUpgrade}
            upgradeState={networkConfig.upgradeState}
          />);
        break;
      case UPGRADE_OPERATIONS.ABORT:
        break;
    }

    return upgradeNetworkModal;
  }

  render() {
    const {networkConfig, upgradeStateDump} = this.props;
    const {topology} = networkConfig;

    const {selectedNodesForUpgrade} = this.state;

    let curBatch = (!!upgradeStateDump && upgradeStateDump.hasOwnProperty('curBatch'))
      ? upgradeStateDump.curBatch : [];

    let pendingBatches = (!!upgradeStateDump && upgradeStateDump.hasOwnProperty('pendingBatches'))
      ? upgradeStateDump.pendingBatches : [];

    const upgradeModal = this.renderUpgradeModal();

    return (
      <div className="network-upgrade">
        {upgradeModal}

        <UpgradeCommandPane
          selectedNodes={selectedNodesForUpgrade}
        />
        <UpgradeMonitor
          topology={topology}
          selectedNodes={selectedNodesForUpgrade}
          curBatch={curBatch}
          pendingBatches={pendingBatches}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
  upgradeStateDump: React.PropTypes.object.isRequired,
}
