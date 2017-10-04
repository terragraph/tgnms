import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import { uploadUpgradeBinary } from '../../apiutils/upgradeAPIUtil.js';


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

    this.state = {
      selectedFile: {}
    }
  }

  modalClose() {
    this.props.onClose();
  }

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState({
      selectedFile: this.refs.upgradeImageFile.files[0]
    });
  }

  onUploadFile = () => {
    // uploadUpgradeBinary(this.state.selectedFile);
  }

  render() {
    let uploadStatusText = 'Upload, what upload?';

    // we have to use refs here to initially access the file and to make sure it exists
    const {upgradeImageFile} = this.refs;
    const isFileSelected = !!upgradeImageFile && upgradeImageFile.files.length > 0;

    return (
      <Modal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className='upgrade-modal-content'>
          <div className='upgrade-modal-upload-row'>
            <div className='upgrade-modal-upload-wrapper'>
              <button className='upgrade-modal-btn'>Select binary for upload</button>
              <input type='file' ref='upgradeImageFile' onChange={this.onSubmitFile} />
            </div>
            <button
              className='upgrade-modal-btn' disabled={!isFileSelected} onClick={this.onUploadFile}
              style={{
                backgroundColor: '#8b9dc3',
                marginLeft: '10px'
              }}
            >Upload binary to server</button>
          </div>

          <div><label style={{marginRight: '10px'}}>File selected:</label>{this.state.selectedFile.name}</div>

          <div className='upgrade-modal-upload-row'>
            image table goes here
          </div>

        </div>
        <div className="upgrade-modal-footer">
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
        </div>
      </Modal>
    );
  }
}

ModalUpgradeBinary.propTypes = {
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
}
