import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

import UpgradeLeftPaneStatus from "./UpgradeLeftPaneStatus.js";

import Dispatcher from "../../NetworkDispatcher.js";
import { Actions } from "../../constants/NetworkConstants.js";

const noNodesAlertProps = {
  title: "No Nodes Selected",
  text: `Please select some nodes to upgrade in the table before proceeding`,
  type: "error"
};

const warningAlertProps = {
  title: "Upgrade(s) Pending",
  text: `There are upgrades in progress that have not been completed yet.
  Your upgrade will be scheduled after the current and pending upgrades have completed.

  Proceed with upgrade?`,
  type: "warning",
  showCancelButton: true,
  confirmButtonText: "Proceed with upgrade",
  cancelButtonText: "Cancel"
};

export default class UpgradeLeftPane extends React.Component {
  constructor(props) {
    super(props);
  }

  isUpgradeInProgress = () => {
    const { currentRequest, pendingRequests } = this.props;
    return currentRequest || pendingRequests.length > 0;
  };

  launchUpgradeServer() {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_UPGRADE_BINARY_MODAL
    });
  }

  resetStatusWithAlert = () => {
    const { selectedNodes } = this.props;
    if (selectedNodes.length === 0) {
      swal(noNodesAlertProps);
    } else if (this.isUpgradeInProgress()) {
      swal(warningAlertProps, isConfirm => {
        if (isConfirm) {
          this.resetStatus();
        }
      });
    } else {
      this.resetStatus();
    }
  };

  resetStatus = () => {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_RESET_STATUS_MODAL
    });
  };

  prepareUpgradeWithAlert = () => {
    const { selectedNodes } = this.props;
    if (selectedNodes.length === 0) {
      swal(noNodesAlertProps);
    } else if (this.isUpgradeInProgress()) {
      swal(warningAlertProps, isConfirm => {
        if (isConfirm) {
          this.prepareUpgrade();
        }
      });
    } else {
      this.prepareUpgrade();
    }
  };

  prepareUpgrade = () => {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_PREPARE_UPGRADE_MODAL
    });
  };

  commitUpgradeWithAlert = () => {
    const { selectedNodes } = this.props;
    if (selectedNodes.length === 0) {
      swal(noNodesAlertProps);
    } else if (this.isUpgradeInProgress()) {
      swal(warningAlertProps, isConfirm => {
        if (isConfirm) {
          this.commitUpgrade();
        }
      });
    } else {
      this.commitUpgrade();
    }
  };

  commitUpgrade = () => {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_COMMIT_UPGRADE_MODAL
    });
  };

  abortUpgrade = () => {
    Dispatcher.dispatch({
      actionType: Actions.OPEN_ABORT_UPGRADE_MODAL
    });
  };

  render() {
    const { currentRequest, pendingRequests } = this.props;

    return (
      <div className="rc-upgrade-left-pane">
        <label style={{ fontSize: "20px", marginTop: "10px" }}>
          Upgrade Operations
        </label>
        <button className="upgrade-btn" onClick={this.launchUpgradeServer}>
          Manage Upgrade Images
        </button>
        <button className="upgrade-btn" onClick={this.resetStatusWithAlert}>
          Reset Status
        </button>
        <button className="upgrade-btn" onClick={this.prepareUpgradeWithAlert}>
          Prepare
        </button>
        <button className="upgrade-btn" onClick={this.commitUpgradeWithAlert}>
          Commit
        </button>
        <button className="upgrade-btn" onClick={this.abortUpgrade}>
          Abort
        </button>
        <UpgradeLeftPaneStatus
          currentRequest={currentRequest}
          pendingRequests={pendingRequests}
        />
      </div>
    );
  }
}

UpgradeLeftPane.propTypes = {
  currentRequest: PropTypes.object,
  pendingRequests: PropTypes.array.isRequired,
  selectedNodes: PropTypes.array.isRequired
};
