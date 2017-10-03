import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';

// master modal file for listing, adding and deleting image binaries
// to be opened in the first button in the menu

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

export default class ModalUpgradeBinary extends React.Component {
  constructor(props) {
    super(props);
  }

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
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-row">
            <label>U r a skrub:</label>
            <input type="number" value={12}
              onChange={(event) => {}}
            />
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
          <button className='upgrade-modal-btn' onClick={() => {console.log('y u so slow');}} style={{'backgroundColor': '#8b9dc3'}}></button>
        </div>
      </Modal>
    );
  }
}

ModalUpgradeBinary.propTypes = {
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
}
