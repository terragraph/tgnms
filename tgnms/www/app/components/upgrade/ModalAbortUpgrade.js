/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {abortUpgrade} from '../../apiutils/UpgradeAPIUtil.js';
import {MODAL_STYLE} from '../../constants/UpgradeConstants.js';
import UpgradeRequestsTable from './UpgradeRequestsTable.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Modal from 'react-modal';
import React from 'react';
import swal from 'sweetalert';

export default class ModalAbortUpgrade extends React.Component {
  static propTypes = {
    upgradeRequests: PropTypes.array.isRequired,

    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
  };

  state = {
    selectedRequests: [],
  };

  modalClose = () => {
    this.setState({
      selectedRequests: [],
    });

    this.props.onClose();
  };

  onReqsSelected = requests => {
    this.setState({
      selectedRequests: requests,
    });
  };

  abortSelected = () => {
    swal(
      {
        title: 'Abort Upgrade',
        text: `You are about to abort upgrades with requests
      ${this.state.selectedRequests}

      This operation cannot be undone once you proceed.

      Proceed with abort?`,
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Proceed',
        cancelButtonText: 'Cancel',
      },
      proceed => {
        if (proceed) {
          const requestBody = {
            topologyName: this.props.topologyName,
            abortAll: false,
            reqIds: this.state.selectedRequests,
          };

          abortUpgrade(requestBody);
        }
        this.props.onClose();
      },
    );
  };

  abortAll = () => {
    swal(
      {
        title: 'Abort Upgrade',
        text: `You are about to abort ALL current and pending upgrades
      This operation cannot be undone once you proceed.

      Proceed with abort?`,
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Proceed',
        cancelButtonText: 'Cancel',
      },
      proceed => {
        if (proceed) {
          const requestBody = {
            topologyName: this.props.topologyName,
            abortAll: true,
            reqIds: [],
          };

          abortUpgrade(requestBody);
        }
        this.props.onClose();
      },
    );
  };

  render() {
    const {upgradeRequests, isOpen} = this.props;
    const {selectedRequests} = this.state;

    return (
      <Modal
        style={MODAL_STYLE}
        isOpen={isOpen}
        onRequestClose={this.modalClose}>
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <UpgradeRequestsTable
              pendingRequests={upgradeRequests}
              height={300}
              isSelectable
              selectedReqs={selectedRequests}
              onReqsSelected={this.onReqsSelected}
            />
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button
            disabled={selectedRequests.length === 0}
            onClick={this.abortSelected}>
            Abort Selected
          </button>
          <button onClick={this.abortAll}>Abort All</button>
          <button onClick={this.modalClose}>Close</button>
        </div>
      </Modal>
    );
  }
}
