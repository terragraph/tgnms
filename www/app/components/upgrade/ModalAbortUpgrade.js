import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
const classNames = require('classnames');

const modalStyle = {
  content : {
    width                 : 'calc(100% - 40px)',
    maxWidth              : '900px',
    display               : 'table',
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
}

export default ModalAbortUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedRequests: [],
      abortAll: false
    };
  }

  modalClose() {
    this.setState({
      selectedRequests: [],
      abortAll: false
    });

    this.props.onClose();
  }

  render() {
    return (
      <Modal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className='upgrade-modal-content'>
          <div className='upgrade-modal-upload-row'>
          </div>
        </div>
        <div className='upgrade-modal-footer'>
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
        </div>
      </Modal>
    );
  }
}

ModalAbortUpgrade.propTypes = {
  upgradeRequests: React.PropTypes.array.isRequired,

  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  topologyName: React.PropTypes.string.isRequired,
}
