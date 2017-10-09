import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
import { uploadUpgradeBinary, listUpgradeImages, deleteUpgradeImage } from '../../apiutils/upgradeAPIUtil.js';

import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import UpgradeImagesTable from './UpgradeImagesTable.js';

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

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    this.state = {
      upgradeImages: [],
      selectedFile: null
    }
  }

  componentWillMount() {
    listUpgradeImages();
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isOpen && nextProps.isOpen) {
      listUpgradeImages();
    }
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.UPGRADE_IMAGES_LOADED:
        if (Array.isArray(payload.upgradeImages)) {
          this.setState({
            upgradeImages: payload.upgradeImages
          });
        }
      default:
        break;
    }
  }

  modalClose() {
    this.setState({
      upgradeImages: [],
      selectedFile: null
    });

    this.props.onClose();
  }

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState({
      selectedFile: this.refs.upgradeImageFile.files[0]
    });
  }

  onUploadFile = () => {
    uploadUpgradeBinary(this.state.selectedFile);
  }

  deleteImage = (imageName) => {
    console.log('deleting image', imageName);
    deleteUpgradeImage(imageName);
  }


  render() {
    const {selectedFile, upgradeImages} = this.state;

    // we have to use refs here to initially access the file and to make sure it exists
    const isFileSelected = !!selectedFile;
    const fileName = isFileSelected ? selectedFile.name : '';

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
            >Add selected binary to server</button>
          </div>

          <div><label style={{marginRight: '10px'}}>File selected:</label>{fileName}</div>

          <div className='upgrade-modal-upload-row'>
            <UpgradeImagesTable
              images={upgradeImages}
              onDeleteImage={this.deleteImage}
            />
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
