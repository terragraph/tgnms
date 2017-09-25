import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

import {commitUpgrade } from '../../apiutils/upgradeAPIUtil.js';
import UpgradeNodesTable from './UpgradeNodesTable.js';

const modalStyle = {
  content : {
    width                 : 'calc(100% - 40px)',
    maxWidth              : '1000px',
    display               : 'table',
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
}

export default class ModalCommitUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedNodes: [],

      timeout: 180,
      skipFailure: true,

      limit: 1, // limit per batch. max batch size is infinite if this is set to 0

      scheduleToCommit: 0, // commit only
    }
  }

  componentWillReceiveProps(nextProps) {
    // reset the selected nodes when the user opens/reopens the modal
    // this is done so our state syncs with the node table state (and we don't need to pass props to that table)
    if (this.props.isOpen !== nextProps.isOpen) {
      this.setState({selectedNodes: []});
    }
  }

  updateSelectedNodes = (selectedNodes) => {
    this.setState({selectedNodes});
  }

  submitCommit() {
    const requestBody = {
      // ugType handled by the server endpoint
      nodes: this.state.selectedNodes,

      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      skipLinks: [],
      limit: this.state.limit,

      scheduleToCommit: this.state.scheduleToCommit,

      requestId: 'NMS' + new Date().getTime(),
      topologyName: this.props.topology.name
    };

    commitUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {
    const {topology, isOpen} = this.props;
    /*
    Commit modal:
      List nodes
      Timeout
      Skipfailure?
      Batch size limit
      Commit delay
    */

    return (
      <Modal
        style={modalStyle}
        isOpen={isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <label>Upgrade timeout (s):</label>
            <input type="number" value={this.state.timeout}
              onChange={(event) => this.setState({'timeout': event.target.value})}
            />
          </div>

          <label>Select nodes to commit for upgrade</label>
          <div className="upgrade-modal-row">
            <UpgradeNodesTable
              height={300}
              topology={topology}
              onNodesSelected={this.updateSelectedNodes}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Skip failures?</label>
            <input type="checkbox" value={this.state.skipFailure}
              onChange={(event) => this.setState({'skipFailure': event.target.checked})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Batch size limit:</label>
            <input type="number" value={this.state.limit}
              onChange={(event) => this.setState({'limit': event.target.value})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Commit delay:</label>
            <input type="number" value={this.state.scheduleToCommit}
              onChange={(event) => this.setState({'scheduleToCommit': event.target.value})}
            />
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
          <button className='upgrade-modal-btn' onClick={this.submitCommit.bind(this)} style={{'backgroundColor': '#8b9dc3'}}>Submit</button>
        </div>
      </Modal>
    );
  }
}

ModalCommitUpgrade.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  topology: React.PropTypes.object.isRequred,
}
