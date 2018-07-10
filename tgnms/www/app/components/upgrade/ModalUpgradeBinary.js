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
import {MODAL_STYLE} from '../../constants/UpgradeConstants.js';
import {UploadStatus, DeleteStatus} from '../../constants/NetworkConstants.js';
import UpgradeImagesTable from './UpgradeImagesTable.js';
import PropTypes from 'prop-types';
import React from 'react';
import {Glyphicon} from 'react-bootstrap';
import Modal from 'react-modal';
import swal from 'sweetalert';

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

  fileInputRef = React.createRef();

  componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) {
      // when the modal is opened
      this.refreshImages();
    }

    if (
      prevProps.uploadStatus !== this.props.uploadStatus &&
      this.props.uploadStatus !== UploadStatus.UPLOADING
    ) {
      this.setState({
        selectedFile: null,
      });
    }
  }

  modalClose = () => {
    this.setState({
      selectedFile: null,
    });

    this.props.onClose();
  };

  refreshImages = () => {
    listUpgradeImages(this.props.topologyName);
  };

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState(
      {
        selectedFile: this.fileInputRef.current.files[0],
      },
      this.onUploadFile,
    );
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
    let uploadStatusDisplay = null;

    switch (this.props.uploadStatus) {
      case UploadStatus.UPLOADING:
        uploadStatusDisplay = (
          <div className="upgrade-modal-row">
            <strong className="subtitle">Uploading</strong>
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
          <div
            role="alert"
            className="alert alert-success upgrade-modal-row success">
            Upload Succeeded
          </div>
        );
        break;
      case UploadStatus.FAILURE:
        uploadStatusDisplay = (
          <div
            role="alert"
            className="alert alert-danger upgrade-modal-row failure">
            Upload Failed
          </div>
        );
        break;
    }
    return uploadStatusDisplay;
  }

  renderDeleteStatus() {
    let deleteStatusDisplay = null;

    switch (this.props.deleteStatus) {
      case DeleteStatus.SUCCESS:
        deleteStatusDisplay = (
          <div
            role="alert"
            className="alert alert-success upgrade-modal-row success">
            Image Successfully Deleted
          </div>
        );
        break;
      case DeleteStatus.FAILURE:
        deleteStatusDisplay = (
          <div
            role="alert"
            className="alert alert-danger upgrade-modal-row failure">
            There was a problem with deleting the image, please try again
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

    return (
      <Modal
        style={MODAL_STYLE}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose}>
        <div className="upgrade-modal-content">
          {!isFileSelected && (
            <div className="upgrade-modal-row file-upload">
              <button
                className="upgrade-modal-btn"
                onClick={() => {
                  if (this.fileInputRef.current) {
                    this.fileInputRef.current.click();
                  }
                }}>
                <Glyphicon glyph="plus" />
                Select Binary for Upload
                <input
                  accept=".bin"
                  onChange={this.onSubmitFile}
                  ref={this.fileInputRef}
                  type="file"
                />
              </button>
              <div
                className="nc-form-action upgrade-modal-repeat-btn"
                onClick={this.refreshImages}
                role="button"
                tabIndex="0">
                <Glyphicon glyph="repeat" />
                <span className="nc-form-action-tooltip">Refresh Images</span>
              </div>
            </div>
          )}
          {this.renderUploadStatus()}
          {this.renderDeleteStatus()}
          <UpgradeImagesTable
            images={upgradeImages}
            onDeleteImage={this.deleteImage}
          />
          <div className="upgrade-modal-footer">
            <button onClick={this.modalClose}>Close</button>
          </div>
        </div>
      </Modal>
    );
  }
}
