/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import Modal from "react-modal";

import { resetStatus } from "../../apiutils/UpgradeAPIUtil.js";

const modalStyle = {
  content: {
    width: "calc(100% - 40px)",
    maxWidth: "800px",
    display: "table",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)"
  }
};

export default class ModalResetStatus extends React.Component {
  constructor(props) {
    super(props);
  }

  submitReset() {
    let nodes = this.props.upgradeNodes;

    const requestBody = {
      nodes,
      requestId: "NMS" + new Date().getTime(),
      topologyName: this.props.topologyName
    };

    resetStatus(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {
    const { upgradeNodes, upgradeState, isOpen } = this.props;

    const nodesList = (
      <div className="upgrade-modal-nodes-list">
        {this.props.upgradeNodes.map((node, idx) => {
          return idx % 2 == 0 ? (
            <p>{node}</p>
          ) : (
            <p style={{ backgroundColor: "#f9f9f9" }}>{node}</p>
          );
        })}
      </div>
    );

    return (
      <Modal
        style={modalStyle}
        isOpen={isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <label>
            Nodes to reset status ({this.props.upgradeNodes.length})
          </label>
          <div className="upgrade-modal-row">{nodesList}</div>
        </div>
        <div className="upgrade-modal-footer">
          <button
            className="upgrade-modal-btn"
            onClick={this.modalClose.bind(this)}
          >
            Close
          </button>
          <button
            className="upgrade-modal-btn"
            onClick={this.submitReset.bind(this)}
            style={{ backgroundColor: "#8b9dc3" }}
          >
            Submit
          </button>
        </div>
      </Modal>
    );
  }
}

ModalResetStatus.propTypes = {
  upgradeNodes: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  topologyName: PropTypes.string.isRequred
};
