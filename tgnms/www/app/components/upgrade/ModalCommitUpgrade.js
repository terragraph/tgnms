/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import ShowMorePanel from '../common/ShowMorePanel.js';
import {commitUpgrade} from '../../apiutils/UpgradeAPIUtil.js';
import {MODAL_STYLE} from '../../constants/UpgradeConstants.js';
import PropTypes from 'prop-types';
import Modal from 'react-modal';
import Select from 'react-select';
import Tooltip from 'react-tooltip';
import React from 'react';
import swal from 'sweetalert';

const BATCHING = {
  AUTO_UNLIMITED: 'auto_unlimited',
  AUTO_LIMITED: 'auto_limited',
  ALL_AT_ONCE: 'all_at_once',
};

export const REQUEST_TYPE = {
  NODES: 'nodes',
  NETWORK: 'network',
  AUTO: 'auto',
};

export default class ModalCommitUpgrade extends React.Component {
  static propTypes = {
    getExcludedNodes: PropTypes.func.isRequired,
    isOpen: PropTypes.bool.isRequired,
    nodeCount: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequred,
    upgradeNodes: PropTypes.array.isRequired,
  };

  state = {
    timeout: 180, // timeout for the entire commit operation per node
    skipFailure: false, // skip failed nodes (will not stop operation)
    skipPopFailure: false, // skip failed POP nodes (will not stop operation)
    limit: 1, // limit per batch. max batch size is infinite if this is set to 0
    requestType: REQUEST_TYPE.AUTO, // network vs nodes upgrade request
    scheduleToCommit: 0, // delay between issuing the command and each node starting the commit
    batchingAlgorithm: BATCHING.AUTO_UNLIMITED,
  };

  submitCommit = () => {
    let nodes = [];
    let excludeNodes = [];
    let ugType = this.state.requestType === REQUEST_TYPE.NODES ? 10 : 20;

    if (this.state.requestType === REQUEST_TYPE.AUTO) {
      // Automatically choose Node or Network Level to create the smallest payload
      if (this.props.upgradeNodes.length < this.props.nodeCount / 2) {
        // Node Level Request
        nodes = this.props.upgradeNodes;
        ugType = 10;
      } else {
        // Network Level Request
        excludeNodes = this.props.getExcludedNodes(this.props.upgradeNodes);
        ugType = 20;
      }
    } else if (this.state.requestType === REQUEST_TYPE.NODES) {
      // Node Level Request
      nodes = this.props.upgradeNodes;
    } else {
      // Network Level Request
      excludeNodes = this.props.getExcludedNodes(this.props.upgradeNodes);
    }

    let limit = 0;
    if (this.state.batchingAlgorithm === BATCHING.AUTO_LIMITED) {
      const n = parseInt(this.state.limit, 10);
      if (isNaN(n) || String(n) !== this.state.limit || n <= 0) {
        swal({
          title: 'Invalid input!',
          text: 'Batch size limit is invalid. Use integers greater than 0.',
          type: 'error',
        });
        return;
      }
      limit = this.state.limit;
    } else if (this.state.batchingAlgorithm === BATCHING.ALL_AT_ONCE) {
      limit = -1;
    }

    const requestBody = {
      ugType,
      nodes,
      excludeNodes,
      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      skipPopFailure: this.state.skipPopFailure,
      skipLinks: [],
      limit,
      scheduleToCommit: this.state.scheduleToCommit,
      topologyName: this.props.topologyName,
    };

    commitUpgrade(requestBody);
    this.props.onClose();
  };

  modalClose = () => {
    this.props.onClose();
  };

  render() {
    const {isOpen, upgradeNodes} = this.props;
    /*
    Commit modal:
      List nodes
      Timeout
      SkipFailure?
      SkipPopFailure?
      Batch size limit
      Commit delay
    */

    return (
      <Modal
        style={MODAL_STYLE}
        isOpen={isOpen}
        onRequestClose={this.modalClose}>
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <strong className="subtitle">
              Nodes to commit for upgrade ({upgradeNodes.length})
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

          <div className="upgrade-modal-row">
            <label>Upgrade Timeout (s):</label>
            <input
              type="number"
              value={this.state.timeout}
              onChange={event => this.setState({timeout: event.target.value})}
            />
          </div>
          <div className="upgrade-modal-row">
            <strong className="subtitle">Batching Algorithm:</strong>
            <div className="type-selector">
              <label
                className="choice auto-unlimited"
                htmlFor={BATCHING.AUTO_UNLIMITED}
                onClick={() =>
                  this.setState({batchingAlgorithm: BATCHING.AUTO_UNLIMITED})
                }>
                <input
                  type="radio"
                  name="batching_algo"
                  value={BATCHING.AUTO_UNLIMITED}
                  checked={
                    this.state.batchingAlgorithm === BATCHING.AUTO_UNLIMITED
                  }
                />
                <div className="choice-label">
                  Automatic Unlimited (no size limit)
                </div>
              </label>
              <label
                className="choice"
                htmlFor={BATCHING.AUTO_LIMITED}
                onClick={() =>
                  this.setState({batchingAlgorithm: BATCHING.AUTO_LIMITED})
                }>
                <input
                  type="radio"
                  name="batching_algo"
                  value={BATCHING.AUTO_LIMITED}
                  checked={
                    this.state.batchingAlgorithm === BATCHING.AUTO_LIMITED
                  }
                />
                <div className="choice-label">Automatic Limited</div>
              </label>
              <label
                className="choice"
                htmlFor={BATCHING.ALL_AT_ONCE}
                onClick={() =>
                  this.setState({batchingAlgorithm: BATCHING.ALL_AT_ONCE})
                }>
                <input
                  type="radio"
                  name="batching_algo"
                  value={BATCHING.ALL_AT_ONCE}
                  checked={
                    this.state.batchingAlgorithm === BATCHING.ALL_AT_ONCE
                  }
                />
                <div className="choice-label">All at Once</div>
              </label>
            </div>
          </div>

          {this.state.batchingAlgorithm === BATCHING.AUTO_LIMITED && (
            <div className="upgrade-modal-row">
              <label>Batch Size Limit (nodes):</label>
              <input
                type="number"
                value={this.state.limit}
                onChange={event => this.setState({limit: event.target.value})}
              />
            </div>
          )}

          <div className="upgrade-modal-row">
            <label>Skip Failures?</label>
            <input
              type="checkbox"
              checked={this.state.skipFailure}
              onChange={event =>
                this.setState({skipFailure: event.target.checked})
              }
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Skip POP Failures?</label>
            <input
              type="checkbox"
              checked={this.state.skipPopFailure}
              onChange={event =>
                this.setState({skipPopFailure: event.target.checked})
              }
            />
          </div>

          <ShowMorePanel
            buttonClass="upgrade-more-options-button"
            moreButtonName="Show Additional Options">
            <div className="upgrade-modal-row">
              <label>Commit Delay (s):</label>
              <input
                type="number"
                value={this.state.scheduleToCommit}
                onChange={event =>
                  this.setState({scheduleToCommit: event.target.value})
                }
              />
            </div>

            <div className="upgrade-modal-row">
              <strong className="subtitle"> Request Type:</strong>
              <div className="type-selector">
                <label
                  className="choice"
                  data-tip="Chooses the request type that creates the smallest payload."
                  htmlFor={REQUEST_TYPE.AUTO}
                  onClick={() =>
                    this.setState({requestType: REQUEST_TYPE.AUTO})
                  }>
                  <input
                    type="radio"
                    name="request_type"
                    value={REQUEST_TYPE.AUTO}
                    checked={this.state.requestType === REQUEST_TYPE.AUTO}
                  />
                  <div className="choice-label">Auto</div>
                </label>
                <Tooltip place="bottom" effect="solid" />
                <label
                  className="choice"
                  htmlFor={REQUEST_TYPE.NETWORK}
                  onClick={() =>
                    this.setState({requestType: REQUEST_TYPE.NETWORK})
                  }>
                  <input
                    type="radio"
                    name="request_type"
                    value={REQUEST_TYPE.NETWORK}
                    checked={this.state.requestType === REQUEST_TYPE.NETWORK}
                  />
                  <div className="choice-label">Network</div>
                </label>
                <label
                  className="choice"
                  htmlFor={REQUEST_TYPE.NODES}
                  onClick={() =>
                    this.setState({requestType: REQUEST_TYPE.NODES})
                  }>
                  <input
                    type="radio"
                    name="request_type"
                    value={REQUEST_TYPE.NODES}
                    checked={this.state.requestType === REQUEST_TYPE.NODES}
                  />
                  <div className="choice-label">Node</div>
                </label>
              </div>
            </div>
          </ShowMorePanel>
        </div>
        <div className="upgrade-modal-footer">
          <button onClick={this.submitCommit}>Submit</button>
          <button onClick={this.modalClose}>Close</button>
        </div>
      </Modal>
    );
  }
}
