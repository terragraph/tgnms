import React from "react";
import { render } from "react-dom";

import Dispatcher from "../../NetworkDispatcher.js";
import { Actions } from "../../constants/NetworkConstants.js";

export default class UpgradeLeftPaneStatus extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { currentRequest, pendingRequests } = this.props;

    const currentRequestId = currentRequest ? (
      <span>{currentRequest.urReq.upgradeReqId}</span>
    ) : (
      <span style={{ color: "#777" }}>
        There are no upgrade requests currently running
      </span>
    );

    const pendingRequestIds =
      pendingRequests.length > 0 ? (
        pendingRequests.map(req => {
          return <p>{req.urReq.upgradeReqId}</p>;
        })
      ) : (
        <span style={{ color: "#777" }}>
          There are no pending upgrade requests
        </span>
      );

    return (
      <div className="rc-upgrade-left-pane-status">
        <div className="upgrade-left-status-row">
          <label className="upgrade-left-pane-label">Current Request</label>
          <div>{currentRequestId}</div>
        </div>
        <div className="upgrade-left-status-row">
          <label className="upgrade-left-pane-label">Pending Requests</label>
          <div>{pendingRequestIds}</div>
        </div>
      </div>
    );
  }
}

UpgradeLeftPaneStatus.propTypes = {
  currentRequest: React.PropTypes.object.isRequired,
  pendingRequests: React.PropTypes.array.isRequired
};
