import React from 'react';
import { render } from 'react-dom';

import { Actions, UploadStatus, DeleteStatus } from '../../constants/NetworkConstants.js';
import { UPGRADE_IMAGE_REFRESH_INTERVAL } from '../../constants/UpgradeConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import { listUpgradeImages } from '../../apiutils/UpgradeAPIUtil.js';

import UpgradeLeftPane from './UpgradeLeftPane.js';
import UpgradeMonitor from './UpgradeMonitor.js';

import ModalUpgradeBinary from './ModalUpgradeBinary.js';
import ModalPrepareUpgrade from './ModalPrepareUpgrade.js';
import ModalCommitUpgrade from './ModalCommitUpgrade.js';
import ModalAbortUpgrade from './ModalAbortUpgrade.js';


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

    this.fetchUpgradeImages();

    // fetch the list of upgrade images every 10 seconds
    // save the interval id so we can clear it when the component unmounts
    const intervalId = setInterval(
      this.fetchUpgradeImages, UPGRADE_IMAGE_REFRESH_INTERVAL
    );

    this.state = {
      // state related to upgrade images
      upgradeImages: [],
      uploadStatus: UploadStatus.NONE,
      uploadProgress: 0,
      deleteStatus: DeleteStatus.NONE,

      // state related to upgrade nodes, a list of node names
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
      case Actions.TOPOLOGY_SELECTED:
        listUpgradeImages(payload.networkName);

        this.setState({
          selectedNodesForUpgrade: [],
          upgradeImages: [],
        });
        break;
      case Actions.UPGRADE_IMAGES_LOADED:
        if (Array.isArray(payload.upgradeImages)) {
          this.setState({
            upgradeImages: payload.upgradeImages,
          });
        }
        break;
      case Actions.FETCH_UPGRADE_IMAGES_FAILED:
        this.setState({
          upgradeImages: [],
        });
        break;
      case Actions.UPGRADE_UPLOAD_STATUS:
        this.setState({
          uploadStatus: payload.uploadStatus,
          uploadProgress: 0,
        });
        break;
      case Actions.UPGRADE_UPLOAD_PROGRESS:
        this.setState({
          uploadProgress: payload.progress,
        });
        break;
      case Actions.UPGRADE_DELETE_IMAGE_STATUS:
        this.setState({
          deleteStatus: payload.deleteStatus,
        });
        break;
      case Actions.UPGRADE_NODES_SELECTED:
        this.setState({
          selectedNodesForUpgrade: payload.nodes,
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
      case Actions.OPEN_ABORT_UPGRADE_MODAL :
        this.setState({
          upgradeModalOpen: true,
          upgradeModalMode: UPGRADE_OPERATIONS.ABORT,
        });
        break;
      default:
        break;
    }
  }

  fetchUpgradeImages = () => {
    const {topology} = this.props.networkConfig;
    listUpgradeImages(topology.name);
  }

  getExcludedNodes = () => {
    const nodes = this.props.networkConfig.topology.nodes;
    const {selectedNodesForUpgrade} = this.state;

    let selectedNames = new Set(selectedNodesForUpgrade);

    return nodes.map(node => node.name).filter((nodeName) => {
      return !selectedNames.has(nodeName);
    });
  }

  hasCurrentRequest = (upgradeStateDump) => {
    return (
      upgradeStateDump &&
      upgradeStateDump.hasOwnProperty('curUpgradeReq') &&
      upgradeStateDump.curUpgradeReq.urReq.upgradeReqId !== ''
    );
  }

  renderUpgradeModal = () => {
    const {networkConfig, upgradeStateDump} = this.props;
    const {
      upgradeModalOpen,
      upgradeModalMode,
      selectedNodesForUpgrade,
      upgradeImages,
      uploadStatus,
      uploadProgress,
      deleteStatus
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
            deleteStatus={deleteStatus}
          />
        );
        break;
      case UPGRADE_OPERATIONS.PREPARE:
        upgradeNetworkModal = (
          <ModalPrepareUpgrade
            getExcludedNodes={this.getExcludedNodes}

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
            getExcludedNodes={this.getExcludedNodes}

            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}
            upgradeNodes={this.state.selectedNodesForUpgrade}
            upgradeState={networkConfig.upgradeState}
          />);
        break;
      case UPGRADE_OPERATIONS.ABORT:
        let pendingRequests = (upgradeStateDump && upgradeStateDump.hasOwnProperty('pendingReqs'))
          ? upgradeStateDump.pendingReqs : [];

        const upgradeRequests = this.hasCurrentRequest(upgradeStateDump) ?
          [upgradeStateDump.curUpgradeReq, ...pendingRequests] : pendingRequests;

        upgradeNetworkModal = (
          <ModalAbortUpgrade
            isOpen={this.state.upgradeModalOpen}
            onClose= {() => this.setState({upgradeModalOpen: false})}
            topologyName={networkConfig.topology.name}
            upgradeRequests={upgradeRequests}
          />);
        break;
    }

    return upgradeNetworkModal;
  }

  render() {
    const {networkConfig, upgradeStateDump} = this.props;
    const {topology} = networkConfig;

    const {selectedNodesForUpgrade} = this.state;

    let currentRequest = this.hasCurrentRequest(upgradeStateDump) ? upgradeStateDump.curUpgradeReq : null;

    let curBatch = (upgradeStateDump && upgradeStateDump.hasOwnProperty('curBatch'))
      ? upgradeStateDump.curBatch : [];

    let pendingBatches = (upgradeStateDump && upgradeStateDump.hasOwnProperty('pendingBatches'))
      ? upgradeStateDump.pendingBatches : [];

    let pendingRequests = (upgradeStateDump && upgradeStateDump.hasOwnProperty('pendingReqs'))
      ? upgradeStateDump.pendingReqs : [];

    const upgradeModal = this.renderUpgradeModal();

    return (
      <div className="network-upgrade">
        {upgradeModal}

        <UpgradeLeftPane
          currentRequest={currentRequest}
          pendingRequests={pendingRequests}
          selectedNodes={selectedNodesForUpgrade}
        />
        <UpgradeMonitor
          topology={topology}
          selectedNodes={selectedNodesForUpgrade}
          curBatch={curBatch}
          pendingBatches={pendingBatches}
          pendingRequests={pendingRequests}
        />
      </div>
    );
  }
}

NetworkUpgrade.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
  upgradeStateDump: React.PropTypes.object.isRequired,
}
