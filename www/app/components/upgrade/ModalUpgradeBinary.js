import React from 'react';
import { render } from 'react-dom';
import Modal from 'react-modal';
const classNames = require('classnames');

import { uploadUpgradeBinary, listUpgradeImages, deleteUpgradeImage } from '../../apiutils/upgradeAPIUtil.js';

import { Actions, UploadStatus } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

import UpgradeImagesTable from './UpgradeImagesTable.js';

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

export default class ModalUpgradeBinary extends React.Component {
  constructor(props) {
    super(props);

    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    this.state = {
      upgradeImages: [],
      selectedFile: null,

      uploadStatus: UploadStatus.NONE,
      uploadProgress: 0,
    }
  }

  componentWillMount() {
    listUpgradeImages(this.props.topologyName);
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isOpen && nextProps.isOpen) {
      listUpgradeImages(this.props.topologyName);
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
        break;
      case Actions.UPGRADE_UPLOAD_STATUS:
        this.setState({
          uploadStatus: payload.uploadStatus,
          uploadProgress: 0
        });
        break;
      case Actions.UPGRADE_UPLOAD_PROGRESS:
        this.setState({
          uploadProgress: payload.progress
        });
        break;
      default:
        break;
    }
  }

  modalClose() {
    this.setState({
      upgradeImages: [],
      selectedFile: null,
      uploadStatus: UploadStatus.NONE,
      uploadProgress: 0,
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
    uploadUpgradeBinary(this.state.selectedFile, this.props.topologyName);
  }

  deleteImage = (imageName) => {
    deleteUpgradeImage(imageName, this.props.topologyName);
  }


  render() {
    const {selectedFile, upgradeImages, uploadStatus, uploadProgress} = this.state;

    // we have to use refs here to initially access the file and to make sure it exists
    const isFileSelected = !!selectedFile;
    const fileName = isFileSelected ? selectedFile.name : '';

    let uploadStatusDisplay = (
      <div></div>
    );

    switch(uploadStatus) {
      case UploadStatus.UPLOADING:
        uploadStatusDisplay = (
          <div>
            <span>Uploading:</span>
            <div className="progress">
              <div
                className="progress-bar"
                role="progressbar" style={{width: uploadProgress + '%'}}
                aria-valuemin="0" aria-valuemax="100"
              >
                {uploadProgress}%
              </div>
            </div>
          </div>
        );
        break;
      case UploadStatus.SUCCESS:
        uploadStatusDisplay = (
          <span
            style={{color: '#009900'}}
          >Upload Succeeded</span>
        );
        break;
      case UploadStatus.FAILURE:
        uploadStatusDisplay = (
          <span
            style={{color: '#990000'}}
          >Upload failed</span>
        );
        break;
    }

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
            <div><label style={{margin: '0px 10px'}}>File selected:</label>{fileName}</div>
          </div>

          <div className='upgrade-modal-row'>
            <button
              className='upgrade-add-img-btn'
              disabled={!isFileSelected}
              onClick={this.onUploadFile}
              style={{margin: '6px 14px'}}
            ><i className={classNames('fa', 'fa-plus')} style={{marginRight: '10px'}}/>Add selected binary to server</button>
          </div>

          {uploadStatusDisplay}

          <div className='upgrade-modal-row'>
            <UpgradeImagesTable
              images={upgradeImages}
              onDeleteImage={this.deleteImage}
            />
          </div>
        </div>
        <div className='upgrade-modal-footer'>
          <button className='upgrade-modal-btn' onClick={this.modalClose.bind(this)}>Close</button>
        </div>
      </Modal>
    );
  }
}

ModalUpgradeBinary.propTypes = {
  isOpen: React.PropTypes.bool.isRequired,
  onClose: React.PropTypes.func.isRequired,
  topologyName: React.PropTypes.string.isRequired,
}
