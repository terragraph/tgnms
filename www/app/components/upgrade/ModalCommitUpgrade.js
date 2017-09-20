import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

import {commitUpgrade } from '../../apiutils/upgradeAPIUtil.js';
// import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

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

    // upgrade group type: network or nodes
    // UpgradeReq:
    // req type

    // TODO: Kelvin: think of some default values for these fields???
    this.state = {
      // UpgradeGroupReq
      selectedNodes: [], // I don't think we'll keep a list of excluded nodes

      timeout: 180,
      skipFailure: true,
      skipLinks: [], // Kelvin: ok, I'm not even sure how to get started on this. Maybe show some sort of visualizer?

      limit: 1, // limit per batch. max batch size is infinite if this is set to 0

      scheduleToCommit: 0, // commit only
    }
  }

  submitCommit() {

    const requestBody = {
      // ugType handled by the server endpoint
      nodes: this.state.selectedNodes,

      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      skipLinks: this.state.skipLinks,
      limit: this.state.limit,

      scheduleToCommit: this.state.scheduleToCommit,

      requestId: 'NMS' + new Date().getTime(),
    };

    console.log('submitting upgrade COMMIT request', requestBody);
    commitUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {

    /*
    Commit modal:
      List nodes TODO
      Timeout
      Skipfailure?
      Batch size limit
      Skip links TODO
      Commit delay
    */

    return (
      <Modal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <label>Upgrade timeout (s):</label>
            <input type="number" value={this.state.timeout}
              onChange={(event) => this.setState({'timeout': event.target.value})}
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


  // instance: React.PropTypes.object.isRequired,
  // routing: React.PropTypes.object.isRequired,
  // topology: React.PropTypes.object.isRequred,
}

ModalCommitUpgrade.defaultProps = {
  // isOpen: false
}
