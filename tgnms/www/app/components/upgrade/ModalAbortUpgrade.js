import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import Modal from "react-modal";

import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

import UpgradeRequestsTable from "./UpgradeRequestsTable.js";

import { abortUpgrade } from "../../apiutils/UpgradeAPIUtil.js";

const classNames = require("classnames");

const modalStyle = {
  content: {
    width: "calc(100% - 40px)",
    maxWidth: "700px",
    display: "table",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)"
  }
};

export default class ModalAbortUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedRequests: []
    };
  }

  modalClose() {
    this.setState({
      selectedRequests: []
    });

    this.props.onClose();
  }

  onReqsSelected = requests => {
    this.setState({
      selectedRequests: requests
    });
  };

  abortSelected = () => {
    swal(
      {
        title: "Abort Upgrade",
        text: `You are about to abort upgrades with requests
      ${this.state.selectedRequests}

      This operation cannot be undone once you proceed.

      Proceed with abort?`,
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Proceed",
        cancelButtonText: "Cancel"
      },
      proceed => {
        if (proceed) {
          const requestBody = {
            topologyName: this.props.topologyName,
            abortAll: false,
            reqIds: this.state.selectedRequests
          };

          abortUpgrade(requestBody);
        }
        this.props.onClose();
      }
    );
  };

  abortAll = () => {
    swal(
      {
        title: "Abort Upgrade",
        text: `You are about to abort ALL current and pending upgrades
      This operation cannot be undone once you proceed.

      Proceed with abort?`,
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Proceed",
        cancelButtonText: "Cancel"
      },
      proceed => {
        if (proceed) {
          const requestBody = {
            topologyName: this.props.topologyName,
            abortAll: true,
            reqIds: []
          };

          abortUpgrade(requestBody);
        }
        this.props.onClose();
      }
    );
  };

  render() {
    const { upgradeRequests, isOpen } = this.props;
    const { selectedRequests } = this.state;

    return (
      <Modal
        style={modalStyle}
        isOpen={isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <UpgradeRequestsTable
              pendingRequests={upgradeRequests}
              height={300}
              isSelectable={true}
              selectedReqs={selectedRequests}
              onReqsSelected={this.onReqsSelected}
            />
          </div>
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
            disabled={selectedRequests.length === 0}
            onClick={this.abortSelected}
          >
            Abort Selected
          </button>
          <button className="upgrade-modal-btn" onClick={this.abortAll}>
            Abort All
          </button>
        </div>
      </Modal>
    );
  }
}

ModalAbortUpgrade.propTypes = {
  upgradeRequests: PropTypes.array.isRequired,

  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  topologyName: PropTypes.string.isRequired
};
