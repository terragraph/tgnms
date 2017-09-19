import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

import {UPGRADE_OPERATIONS} from '../../NetworkUI.js';
import { prepareUpgrade } from '../../apiutils/upgradeAPIUtil.js';
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

export default class ModalUpgradeNetwork extends React.Component {
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

      // UpgradeReq
      // urType will be set as a prop.
      // upgradeReqId is randomly generated when we submit?
      md5: "test md5",
      imageUrl: "test imageUrl", // not needed for commit upgrades

      scheduleToCommit: 0, // commit only
      downloadAttempts: 1, // prepare only
      // TODO: Kelvin: torrent params, when we detect that the image url is 1
    }
  }


  submitPrepare() {
    const upgradeReq = {
      // TODO: generate a request id here?,
      md5: this.state.md5,
      imageUrl: this.state.imageUrl,

      downloadAttempts: this.state.downloadAttempts,
      // TODO: torrent params
    };

    const upgradeGroupReq = {
      // ugType handled by the server endpoint
      nodes: this.state.selectedNodes,
      urReq: upgradeReq,
      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      // version handled by the server
      // skiplinks not needed for prepare
      limit: this.state.limit,
    };

    console.log('submitting upgrade PREPARE request', upgradeGroupReq);
    prepareUpgrade(upgradeGroupReq);
    this.props.onClose();
  }

  submitCommit() {

    const upgradeReq = {
      // TODO: generate a request id here?,
      md5: this.state.md5,
      scheduleToCommit: this.state.scheduleToCommit,
    };

    const upgradeGroupReq = {
      // ugType handled by the server endpoint
      nodes: this.state.selectedNodes,
      urReq: upgradeReq,
      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,
      // version handled by the server
      skiplinks: this.state.skipLinks,
      limit: this.state.limit,
    };

    console.log('submitting upgrade COMMIT request', upgradeGroupReq);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {
    const submitModal = this.props.upgradeOperation === UPGRADE_OPERATIONS.PREPARE ?
      this.submitPrepare : this.submitCommit;

    /*
    Prepare modal:
      List nodes TODO
      Timeout
      SkipFailure?
      Batch size limit
      URL of image
      MD5 of image
      Number of download attempts for image

    Commit modal:
      List nodes TODO
      Timeout
      Skipfailure?
      Batch size limit
      MD5 of image
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

          {this.props.upgradeOperation === UPGRADE_OPERATIONS.PREPARE &&
            <div className="upgrade-modal-row">
              <label>Url of upgrade image:</label>
              <input type="text" value={this.state.imageUrl}
                onChange={(event) => this.setState({'imageUrl': event.target.value})}
              />
            </div>
          }

          <div className="upgrade-modal-row">
            <label>Md5 of upgrade image:</label>
            <input type="text" value={this.state.md5}
              onChange={(event) => this.setState({'md5': event.target.value})}
            />
          </div>

          {this.props.upgradeOperation === UPGRADE_OPERATIONS.PREPARE &&
            <div className="upgrade-modal-row">
              <label>Download attempts for image:</label>
              <input type="number" value={this.state.downloadAttempts}
                onChange={(event) => this.setState({'downloadAttempts': event.target.value})}
              />
            </div>
          }

          {this.props.upgradeOperation === UPGRADE_OPERATIONS.COMMIT &&
            <div className="upgrade-modal-row">
              <label>Commit delay:</label>
              <input type="number" value={this.state.scheduleToCommit}
                onChange={(event) => this.setState({'scheduleToCommit': event.target.value})}
              />
            </div>
          }

        </div>
        <div className="upgrade-modal-footer">
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
          <button className='upgrade-modal-btn' onClick={submitModal.bind(this)} style={{'backgroundColor': '#8b9dc3'}}>Submit</button>
        </div>
      </Modal>
    );
  }
}

ModalUpgradeNetwork.propTypes = {
  upgradeOperation: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,


  // instance: React.PropTypes.object.isRequired,
  // routing: React.PropTypes.object.isRequired,
  // topology: React.PropTypes.object.isRequred,
}

ModalUpgradeNetwork.defaultProps = {
  // isOpen: false
}
