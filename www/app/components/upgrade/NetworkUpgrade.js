import React from 'react';
import { render } from 'react-dom';

import { Actions, UploadStatus } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import { listUpgradeImages } from '../../apiutils/upgradeAPIUtil.js';

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

    const topologyName = this.props.networkConfig.topology.name;

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    listUpgradeImages(topologyName);

    // fetch the list of upgrade images every 5 seconds
    // save the interval id so we can clear it when the component unmounts
    const intervalId = setInterval(
      () => listUpgradeImages(topologyName), 10000
    );

    this.state = {
      // state related to upgrade images
      upgradeImages: [],
      uploadStatus: UploadStatus.NONE,
      uploadProgress: 0,

      // state related to upgrade nodes
      selectedNodesForUpgrade: [],

      upgradeModalOpen: false,
      upgradeModalMode: UPGRADE_OPERATIONS.PREPARE,

      intervalId: intervalId,
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.UPGRADE_IMAGES_LOADED:
        if (Array.isArray(payload.upgradeImages)) {
          this.setState({
            upgradeImages: payload.upgradeImages
          });
        }
        break;
      case Actions.UPGRADE_UPLOAD_STATUS:
        this.setState({
          uploadStatus: payload.uploadStatus,
          uploadProgress: 0
        });
        break;
      case Actions.UPGRADE_UPLOAD_PROGRESS:
        this.setState({
          uploadProgress: payload.progress
        });
        break;
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
    const {
      upgradeModalOpen,
      upgradeModalMode,
      selectedNodesForUpgrade,
      upgradeImages,
      uploadStatus,
      uploadProgress
    } = this.state;

    let upgradeNetworkModal = <div/>;
    switch (upgradeModalMode) {
      case UPGRADE_OPERATIONS.BINARY:
        upgradeNetworkModal = (
          <ModalUpgradeBinary
            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}

            upgradeImages={upgradeImages}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
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
            upgradeImages={upgradeImages}
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
