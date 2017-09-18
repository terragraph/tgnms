import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
// import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const modalStyle = {
  content : {
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
      selectAll: false, // this links to a selector in the node list. (select all)
      selectedNodes: [], // I don't think we'll keep a list of excluded nodes
      timeout: 10000,
      skipFailure: false,
      version: "",
      skipLinks: [], // Kelvin: ok, I'm not even sure how to get started on this. Maybe show some sort of visualizer?
      limit: 1, // limit per batch. max batch size is infinite if this is set to 0

      // UpgradeReq
      // urType will be set as a prop.
      // upgradeReqId is randomly generated when we submit?
      md5: "",
      imageUrl: "", // not needed for commit upgrades
      scheduleToCommit: 0,
      downloadAttempts: 1,
      // TODO: Kelvin: torrent params, when we detect that the image url is 1
    }
  }

  // default props here

  modalClose() {
    this.props.onClose();
  }


  render() {
    return (
        <Modal
          style={modalStyle}
          isOpen={this.props.isOpen}
          onRequestClose={this.modalClose.bind(this)}
        >
          <button onClick={this.modalClose.bind(this)}>Close</button>
          cool stuff yo
        </Modal>
    );
  }
}

ModalUpgradeNetwork.propTypes = {
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,


  // instance: React.PropTypes.object.isRequired,
  // routing: React.PropTypes.object.isRequired,
  // topology: React.PropTypes.object.isRequred,
}

ModalUpgradeNetwork.defaultProps = {
  isOpen: false
}
