import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

import { commitUpgrade } from '../../apiutils/upgradeAPIUtil.js';

const modalStyle = {
  content : {
    width                 : 'calc(100% - 40px)',
    maxWidth              : '800px',
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
      timeout: 180,         // timeout for the entire commit operation
      skipFailure: true,    // skip failed nodes (will not stop operation)
      limit: 1,             // limit per batch. max batch size is infinite if this is set to 0

      scheduleToCommit: 0,  // delay between issuing the command and
    }
  }

  submitCommit() {
    const requestBody = {
      nodes:            this.props.upgradeNodes,
      timeout:          this.state.timeout,
      skipFailure:      this.state.skipFailure,
      skipLinks:        [],
      limit:            this.state.limit,

      scheduleToCommit: this.state.scheduleToCommit,

      requestId:        'NMS' + new Date().getTime(),
      topologyName:     this.props.topologyName,
    };

    commitUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.props.onClose();
  }

  render() {
    const {isOpen} = this.props;
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
        {this.props.upgradeNodes.map((node) => <p>{node}</p>)}
      </div>
    )

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

          <label>Nodes to commit for upgrade ({this.props.upgradeNodes.length})</label>
          <div className="upgrade-modal-row">
            {nodesList}
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
  upgradeNodes: React.PropTypes.array.isRequired,
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  topologyName: React.PropTypes.string.isRequred,
}
