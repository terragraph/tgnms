/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {resetStatus} from '../../apiutils/UpgradeAPIUtil.js';
import {MODAL_STYLE} from '../../constants/UpgradeConstants.js';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';

export default class ModalResetStatus extends React.Component {
  static propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequred,
    upgradeNodes: PropTypes.array.isRequired,
  };

  submitReset = () => {
    const nodes = this.props.upgradeNodes;
    const requestBody = {
      nodes,
      requestId: 'NMS' + new Date().getTime(),
      topologyName: this.props.topologyName,
    };

    resetStatus(requestBody);
    this.props.onClose();
  };

  modalClose = () => {
    this.props.onClose();
  };

  render() {
    const {isOpen, upgradeNodes, upgradeState} = this.props;

    return (
      <Modal
        style={MODAL_STYLE}
        isOpen={isOpen}
        onRequestClose={this.modalClose}>
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <strong className="subtitle">
              Nodes to reset status ({this.props.upgradeNodes.length})
            </strong>
            <Select
              className="upgrade-modal-node-list"
              clearable={false}
              disabled
              multi
              options={upgradeNodes.map(node => ({value: node, label: node}))}
              placeholder=""
              value={upgradeNodes.join(',')}
            />
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button onClick={this.submitReset}>Submit</button>
          <button onClick={this.modalClose}>Close</button>
        </div>
      </Modal>
    );
  }
}
