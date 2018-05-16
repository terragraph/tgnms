/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import PropTypes from 'prop-types';
import React from "react";
import { render } from "react-dom";
import Modal from "react-modal";

import swal from "sweetalert";
import "sweetalert/dist/sweetalert.css";

import {
  UploadStatus,
  DeleteStatus
} from "../../constants/NetworkConstants.js";
import {
  uploadUpgradeBinary,
  listUpgradeImages,
  deleteUpgradeImage
} from "../../apiutils/UpgradeAPIUtil.js";

import UpgradeImagesTable from "./UpgradeImagesTable.js";

const classNames = require("classnames");

const modalStyle = {
  content: {
    width: "calc(100% - 40px)",
    maxWidth: "900px",
    display: "table",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)"
  }
};

export default class ModalUpgradeBinary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedFile: null
    };
  }

  componentWillMount() {
    this.refreshImages();
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isOpen && nextProps.isOpen) {
      // when the modal is opened
      this.refreshImages();
    }
  }

  modalClose() {
    this.setState({
      selectedFile: null
    });

    this.props.onClose();
  }

  refreshImages = () => {
    listUpgradeImages(this.props.topologyName);
  };

  onSubmitFile = () => {
    // use state to ensure instantaneous update
    this.setState({
      selectedFile: this.refs.upgradeImageFile.files[0]
    });
  };

  onUploadFile = () => {
    uploadUpgradeBinary(this.state.selectedFile, this.props.topologyName);
  };

  deleteImage = imageName => {
    swal(
      {
        title: "Are you sure?",
        text: "You will not be able to recover the image once deleted",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete Image",
        cancelButtonText: "Cancel"
      },
      confirm => {
        if (confirm) {
          deleteUpgradeImage(imageName, this.props.topologyName);
        }
      }
    );
  };

  renderUploadStatus = () => {
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
                style={{ width: this.props.uploadProgress + "%" }}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {this.props.uploadProgress}%
              </div>
            </div>
          </div>
        );
        break;
      case UploadStatus.SUCCESS:
        uploadStatusDisplay = (
          <div>
            <span style={{ color: "#009900" }}>Upload Succeeded</span>
          </div>
        );
        break;
      case UploadStatus.FAILURE:
        uploadStatusDisplay = (
          <div>
            <span style={{ color: "#990000" }}>Upload Failed</span>
          </div>
        );
        break;
    }
    return uploadStatusDisplay;
  };

  renderDeleteStatus = () => {
    let deleteStatusDisplay = <div />;

    switch (this.props.deleteStatus) {
      case DeleteStatus.SUCCESS:
        deleteStatusDisplay = (
          <div>
            <span style={{ color: "#009900" }}>Image Successfully Deleted</span>
          </div>
        );
        break;
      case DeleteStatus.FAILURE:
        deleteStatusDisplay = (
          <div>
            <span style={{ color: "#990000" }}>
              There was a problem with deleting the image, please try again
            </span>
          </div>
        );
        break;
    }

    return deleteStatusDisplay;
  };

  render() {
    const { upgradeImages, uploadStatus, uploadProgress } = this.props;
    const { selectedFile } = this.state;

    // we have to use refs here to initially access the file and to make sure it exists
    const isFileSelected = !!selectedFile;
    const fileName = isFileSelected ? selectedFile.name : "";

    const uploadStatusDisplay = this.renderUploadStatus();
    const deleteStatusDisplay = this.renderDeleteStatus();

    return (
      <Modal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={this.modalClose.bind(this)}
      >
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
              <label style={{ margin: "0px 10px" }}>File selected:</label>
              {fileName}
            </div>
          </div>

          <div className="upgrade-modal-row">
            <button
              className="upgrade-add-img-btn"
              disabled={!isFileSelected}
              onClick={this.onUploadFile}
              style={{ margin: "6px 14px" }}
            >
              <img
                src="/static/images/add.png"
                style={{ marginRight: "10px", height: "18px", width: "18px" }}
              />Add selected binary to server
            </button>
          </div>

          {uploadStatusDisplay}
          {deleteStatusDisplay}

          <div className="upgrade-modal-row">
            <img
              src="/static/images/refresh.png"
              className="refresh-images"
              onClick={this.refreshImages}
            />
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
            onClick={this.modalClose.bind(this)}
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }
}

ModalUpgradeBinary.propTypes = {
  upgradeImages: PropTypes.array.isRequired,
  uploadStatus: PropTypes.string.isRequired,
  deleteStatus: PropTypes.string.isRequired,
  uploadProgress: PropTypes.number.isRequired,

  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  topologyName: PropTypes.string.isRequired
};
