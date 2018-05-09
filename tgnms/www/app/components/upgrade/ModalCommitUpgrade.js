import React from "react";
import { render } from "react-dom";
import Modal from "react-modal";
import swal from "sweetalert";

import { commitUpgrade } from "../../apiutils/UpgradeAPIUtil.js";

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

export default class ModalCommitUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeout: 180, // timeout for the entire commit operation per node
      skipFailure: true, // skip failed nodes (will not stop operation)
      limit: 1, // limit per batch. max batch size is infinite if this is set to 0

      requestType: 'network', // network vs nodes upgrade request

      scheduleToCommit: 0, // delay between issuing the command and each node starting the commit

      batchingAlgorithm: 'auto_unlimited'
    };
  }

  submitCommit() {
    let nodes = [];
    let excludeNodes = [];

    if (this.state.requestType === 'nodes') {
      // node level request
      nodes = this.props.upgradeNodes;
    } else {
      excludeNodes = this.props.getExcludedNodes();
    }

    const ugType = this.state.requestType === 'nodes' ? 10 : 20;

    var limit = 0;
    if (this.state.batchingAlgorithm === 'auto_limited') {
      var n = parseInt(this.state.limit, 10);
      if (n == NaN || String(n) !== this.state.limit || n < 1) {
        swal({
          title: "Invalid input!",
          text: `Batch size limit is invalid. Use integers greater than 0.`,
          type: "error"
        });
        return;
      }
      limit = this.state.limit;
    } else if (this.state.batchingAlgorithm === 'all_at_once') {
      limit = -1;
    }

    const requestBody = {
      ugType,
      nodes,
      excludeNodes,
      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      skipLinks: [],

      limit: limit,

      scheduleToCommit: this.state.scheduleToCommit,

      requestId: "NMS" + new Date().getTime(),
      topologyName: this.props.topologyName
    };

    commitUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {
    const { isOpen } = this.props;
    /*
    Commit modal:
      List nodes
      Timeout
      Skipfailure?
      Batch size limit
      Commit delay
    */

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
            Nodes to commit for upgrade ({this.props.upgradeNodes.length})
          </label>
          <div className="upgrade-modal-row">{nodesList}</div>

          <div className="upgrade-modal-row">
            <label>Upgrade timeout (s):</label>
            <input
              type="number"
              value={this.state.timeout}
              onChange={event => this.setState({ timeout: event.target.value })}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Skip failures?</label>
            <input
              type="checkbox"
              checked={this.state.skipFailure}
              onChange={event =>
                this.setState({ skipFailure: event.target.checked })
              }
            />
          </div>

          <form style={{ marginBottom: "10px" }}>
            <label style={{ float: "left", width: "55%" }}>
              Batching Algorithm:
            </label>
            <div className="batching-type-selector">
              <input
                type="radio"
                name="batching_algo"
                value="auto_unlimited"
                checked={this.state.batchingAlgorithm === 'auto_unlimited'}
                onChange={event =>
                  this.setState({ batchingAlgorithm: 'auto_unlimited' })
                }
              />
              <label for="auto_unlimited" style={{ marginRight: "20px", marginLeft: "5px" }}>
                Automatic (No size limit)
              </label>
            </div>
          </form>

          <form style={{ marginBottom: "10px" }}>
            <label style={{ float: "left", width: "55%" }}> </label>
            <div className="batching-type-selector">
              <input
                type="radio"
                name="batching_algo"
                value="auto_limited"
                checked={this.state.batchingAlgorithm === 'auto_limited'}
                onChange={event =>
                  this.setState({ batchingAlgorithm: 'auto_limited' })
                }
              />
              <label for="auto_limited" style={{ marginRight: "20px", marginLeft: "5px" }}>
                Automatic (with limit)
              </label>
            </div>
          </form>

          {(this.state.batchingAlgorithm === 'auto_limited') && (
            <div className="upgrade-modal-row">
              <label>Batch size limit:</label>
              <input
                type="number"
                value={this.state.limit}
                onChange={event => this.setState({ limit: event.target.value })}
              />
            </div>
          )}

          <form style={{ marginBottom: "10px" }}>
            <label style={{ float: "left", width: "55%" }}> </label>
            <div className="batching-type-selector">
              <input
                type="radio"
                name="batching_algo"
                value="all_at_once"
                checked={this.state.batchingAlgorithm === 'all_at_once'}
                onChange={event =>
                  this.setState({ batchingAlgorithm: 'all_at_once' })
                }
              />
              <label for="all_at_once" style={{ marginRight: "20px", marginLeft: "5px" }}>
                All at once!
              </label>
            </div>
          </form>

          <div className="upgrade-modal-row">
            <label>Commit delay:</label>
            <input
              type="number"
              value={this.state.scheduleToCommit}
              onChange={event =>
                this.setState({ scheduleToCommit: event.target.value })
              }
            />
          </div>

          <form style={{ marginBottom: "10px" }}>
            <label style={{ float: "left", width: "55%" }}> Request Type</label>
            <div className="batching-type-selector">
              <input
                type="radio"
                name="request_type"
                value="network"
                checked={this.state.requestType === 'network'}
                onChange={event =>
                  this.setState({ requestType: 'network' })
                }
              />
              <label for="network" style={{ marginRight: "20px", marginLeft: "5px" }}>
                Network
              </label>
              <input
                type="radio"
                name="request_type"
                value="nodes"
                checked={this.state.requestType === 'nodes'}
                onChange={event =>
                  this.setState({ requestType: 'nodes' })
                }
              />
              <label for="nodes" style={{ marginRight: "20px", marginLeft: "5px" }}>
                Nodes
              </label>
            </div>
          </form>
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
            onClick={this.submitCommit.bind(this)}
            style={{ backgroundColor: "#8b9dc3" }}
          >
            Submit
          </button>
        </div>
      </Modal>
    );
  }
}

ModalCommitUpgrade.propTypes = {
  getExcludedNodes: React.PropTypes.func.isRequired,

  upgradeNodes: React.PropTypes.array.isRequired,
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  topologyName: React.PropTypes.string.isRequred
};
