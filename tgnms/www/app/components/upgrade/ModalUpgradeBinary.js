/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {
  uploadUpgradeBinary,
  listUpgradeImages,
  deleteUpgradeImage,
} from '../../apiutils/UpgradeAPIUtil.js';
import {UploadStatus, DeleteStatus} from '../../constants/NetworkConstants.js';
import UpgradeImagesTable from './UpgradeImagesTable.js';
import PropTypes from 'prop-types';
import Modal from 'react-modal';
import React from 'react';
import swal from 'sweetalert';

const modalStyle = {
  content: {
    bottom: 'auto',
    display: 'table',
    left: '50%',
    marginRight: '-50%',
    maxWidth: '900px',
    right: 'auto',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'calc(100% - 40px)',
  },
};

export default class ModalUpgradeBinary extends React.Component {
  static propTypes = {
    deleteStatus: PropTypes.string.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
    upgradeImages: PropTypes.array.isRequired,
    uploadProgress: PropTypes.number.isRequired,
    uploadStatus: PropTypes.string.isRequired,
  };

  state = {
    selectedFile: null,
  };

  UNSAFE_componentWillMount() {
    this.refreshImages();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!this.props.isOpen && nextProps.isOpen) {
      // when the modal is opened
      this.refreshImages();
    }
  }

  modalClose() {
    this.setState({
      selectedFile: null,
    });

    this.props.onClose();
  }

  refreshImages = () => {
    listUpgradeImages(this.props.topologyName);
  };

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState({
      selectedFile: this.refs.upgradeImageFile.files[0],
    });
  };

  onUploadFile = () => {
    uploadUpgradeBinary(
      this.state.selectedFile,
      this.props.topologyName,
    ).then();
  };

  deleteImage = imageName => {
    swal(
      {
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Delete Image',
        showCancelButton: true,
        text: 'You will not be able to recover the image once deleted',
        title: 'Are you sure?',
        type: 'warning',
      },
      confirm => {
        if (confirm) {
          deleteUpgradeImage(imageName, this.props.topologyName);
        }
      },
    );
  };

  renderUploadStatus() {
    let uploadStatusDisplay = <div />;

    switch (this.props.uploadStatus) {
      case UploadStatus.UPLOADING:
        uploadStatusDisplay = (
          <div>
            <span>Uploading:</span>
            <div className="progress">
              <div
                className="progress-bar"
                role="progressbar"
                style={{width: this.props.uploadProgress + '%'}}
                aria-valuemin="0"
                aria-valuemax="100">
                {this.props.uploadProgress}%
              </div>
            </div>
          </div>
        );
        break;
      case UploadStatus.SUCCESS:
        uploadStatusDisplay = (
          <div>
            <span style={{color: '#009900'}}>Upload Succeeded</span>
          </div>
        );
        break;
      case UploadStatus.FAILURE:
        uploadStatusDisplay = (
          <div>
            <span style={{color: '#990000'}}>Upload Failed</span>
          </div>
        );
        break;
    }
    return uploadStatusDisplay;
  }

  renderDeleteStatus() {
    let deleteStatusDisplay = <div />;

    switch (this.props.deleteStatus) {
      case DeleteStatus.SUCCESS:
        deleteStatusDisplay = (
          <div>
            <span style={{color: '#009900'}}>Image Successfully Deleted</span>
          </div>
        );
        break;
      case DeleteStatus.FAILURE:
        deleteStatusDisplay = (
          <div>
            <span style={{color: '#990000'}}>
              There was a problem with deleting the image, please try again
            </span>
          </div>
        );
        break;
    }

    return deleteStatusDisplay;
  }

  render() {
    const {upgradeImages} = this.props;
    const {selectedFile} = this.state;

    // we have to use refs here to initially access the file and to make sure
    // it exists
    const isFileSelected = !!selectedFile;
    const fileName = isFileSelected ? selectedFile.name : '';

    const uploadStatusDisplay = this.renderUploadStatus();
    const deleteStatusDisplay = this.renderDeleteStatus();

    return (
      <Modal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}>
        <div className="upgrade-modal-content">
          <div className="upgrade-modal-upload-row">
            <div className="upgrade-modal-upload-wrapper">
              <button className="upgrade-modal-btn">
                Select binary for upload
              </button>
              <input
                type="file"
                ref="upgradeImageFile"
                onChange={this.onSubmitFile}
              />
            </div>
            <div>
              <label style={{margin: '0px 10px'}}>File selected:</label>
              {fileName}
            </div>
          </div>

          <div className="upgrade-modal-row">
            <button
              className="upgrade-add-img-btn"
              disabled={!isFileSelected}
              onClick={this.onUploadFile}
              style={{margin: '6px 14px'}}>
              <img
                src="/static/images/add.png"
                style={{height: '18px', marginRight: '10px', width: '18px'}}
              />Add selected binary to server
            </button>
          </div>

          {uploadStatusDisplay}
          {deleteStatusDisplay}

          <div className="upgrade-modal-row">
            <span onClick={this.refreshImages} role="button" tabIndex="0">
              <img
                src="/static/images/refresh.png"
                className="refresh-images"
              />
            </span>
          </div>
          <div className="upgrade-modal-row">
            <UpgradeImagesTable
              images={upgradeImages}
              onDeleteImage={this.deleteImage}
            />
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button
            className="upgrade-modal-btn"
            onClick={this.modalClose.bind(this)}>
            Close
          </button>
        </div>
      </Modal>
    );
  }
}
