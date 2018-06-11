/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import {prepareUpgrade} from '../../apiutils/UpgradeAPIUtil.js';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';

const modalStyle = {
  content: {
    width: 'calc(100% - 40px)',
    maxWidth: '800px',
    display: 'table',
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

export default class ModalPrepareUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeout: 180, // timeout for the entire prepare operation
      skipFailure: true, // skip failed nodes (will not stop operation)
      isParallel: true, // parallelize teh operation? (put all nodes in one batch)
      limit: 1, // limit per batch. max batch size is infinite if this is set to 0
      selectedImage: {}, // image to upgrade, with a name and a link

      // HTTP
      downloadAttempts: 1, // number of attempts for downloading the image

      // TORRENT
      downloadTimeout: 180, // timeout for torrent download
      downloadLimit: -1, // limit for torrent download speed (-1 for unlimited)
      uploadLimit: -1, // limit for torrent upload speed (-1 for unlimited)
      maxConnections: -1, // max concurrent connections for torrent (-1 for unlimited)

      isHttp: false, // internal component state to let the user specify http or torrent properties
    };
  }

  submitPrepare() {
    if (Object.keys(this.state.selectedImage).length === 0) {
      swal({
        title: 'No Image Selected',
        text: `No image was selected for upgrade.
        Please select one from the list or upload one through the "Manage Upgrade Images" option.
        `,
        type: 'error',
      });
      return;
    }

    const excludeNodes = this.props.getExcludedNodes();

    if (!this.state.isParallel) {
      const n = parseInt(this.state.limit, 10);
      if (isNaN(n) || String(n) !== this.state.limit || n < 1) {
        swal({
          title: 'Invalid input!',
          text: 'Batch size limit is invalid. Use integers greater than 0.',
          type: 'error',
        });
        return;
      }
    }

    const requestBody = {
      excludeNodes,
      imageUrl: this.state.selectedImage.magnetUri,
      md5: this.state.selectedImage.md5,

      timeout: this.state.timeout,
      skipFailure: this.state.skipFailure,

      // limit of 0 means unlimited max batch size
      limit: this.state.isParallel ? 0 : this.state.limit,

      requestId: 'NMS' + new Date().getTime(),
      isHttp: this.state.isHttp,
      topologyName: this.props.topologyName,
    };

    // populate either the downloadAttempts or the torrentParams depending on the user selected mode
    if (this.state.isHttp) {
      requestBody.downloadAttempts = this.state.downloadAttempts;
    } else {
      requestBody.torrentParams = {
        downloadTimeout: this.state.downloadTimeout,
        downloadLimit: this.state.downloadLimit,
        uploadLimit: this.state.uploadLimit,
        maxConnections: this.state.maxConnections,
      };
    }

    prepareUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.setState({
      selectedImage: {},
    });
    this.props.onClose();
  }

  onChangeDownloadMode = e => {
    this.setState({isHttp: e.currentTarget.value === 'http'});
  };

  selectUpgradeImage = val => {
    const {upgradeImages} = this.props;
    const selectedImageName = val.value;

    upgradeImages.forEach(image => {
      if (image.name === selectedImageName) {
        this.setState({selectedImage: image});
        return;
      }
    });
  };

  renderUpgradeImages() {
    const {upgradeImages} = this.props;
    const {selectedImage} = this.state;

    // .slice(28) is used to remove the "Facebook Terragraph Release" prefix from the image name
    // e.g:
    // "Facebook Terragraph Release RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
    // turns into "RELEASE_M15_RC1-michaelcallahan (michaelcallahan@devbig730 Fri Sep 22 20:31:23 PDT 2017)"
    const selectOptions = upgradeImages.map(image => {
      const imageDisplayName = image.name.slice(28);
      return {
        label: imageDisplayName,
        value: image.name,
      };
    });

    return (
      <div className="upgrade-modal-row">
        <label>Select an upgrade image</label>
        <Select
          name="Select Image"
          value={selectedImage.name}
          options={selectOptions}
          onChange={this.selectUpgradeImage}
          clearable={false}
        />
      </div>
    );
  }

  render() {
    const {upgradeNodes, upgradeState, isOpen} = this.props;
    /*
    Prepare modal:
      List nodes
      Timeout
      SkipFailure?
      Batch size limit
      URL of image (selected by image name)

      // HTTP ONLY
        Number of download attempts for image

      // TORRENT ONLY
        download timeout
        download limit
        upload limit
        maxConnections
    */

    const nodesList = (
      <div className="upgrade-modal-nodes-list">
        {this.props.upgradeNodes.map((node, idx) => {
          return idx % 2 == 0 ? (
            <p>{node}</p>
          ) : (
            <p style={{backgroundColor: '#f9f9f9'}}>{node}</p>
          );
        })}
      </div>
    );

    const imagesList = this.renderUpgradeImages();

    return (
      <Modal
        style={modalStyle}
        isOpen={isOpen}
        onRequestClose={this.modalClose.bind(this)}>
        <div className="upgrade-modal-content">
          <label>Nodes to prepare for upgrade ({upgradeNodes.length})</label>
          <div className="upgrade-modal-row">{nodesList}</div>

          {imagesList}

          <div className="upgrade-modal-row">
            <label>Upgrade timeout (s):</label>
            <input
              type="number"
              value={this.state.timeout}
              onChange={event => this.setState({timeout: event.target.value})}
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Skip failures?</label>
            <input
              type="checkbox"
              checked={this.state.skipFailure}
              onChange={event =>
                this.setState({skipFailure: event.target.checked})
              }
            />
          </div>

          <div className="upgrade-modal-row">
            <label>Fully Parallelize upgrade?</label>
            <input
              type="checkbox"
              checked={this.state.isParallel}
              onChange={event =>
                this.setState({isParallel: event.target.checked})
              }
            />
          </div>

          {!this.state.isParallel && (
            <div className="upgrade-modal-row">
              <label>Batch size limit (nodes):</label>
              <input
                type="number"
                value={this.state.limit}
                onChange={event => this.setState({limit: event.target.value})}
              />
            </div>
          )}

          <form style={{marginBottom: '10px'}}>
            <label style={{float: 'left', width: '55%'}}>
              Specify the mode to retrieve the image:
            </label>
            <div className="download-type-selector">
              <input
                type="radio"
                id="http"
                value="http"
                onChange={this.onChangeDownloadMode}
                checked={this.state.isHttp}
                disabled={true}
              />
              <label
                for="http"
                style={{marginRight: '20px', opacity: 0.5, marginLeft: '5px'}}>
                Http
              </label>

              <input
                type="radio"
                name="torrent"
                value="torrent"
                onChange={this.onChangeDownloadMode}
                checked={!this.state.isHttp}
              />
              <label
                for="torrent"
                style={{marginRight: '20px', marginLeft: '5px'}}>
                Torrent
              </label>
            </div>
          </form>

          {this.state.isHttp && (
            <div className="upgrade-modal-row">
              <label>Download attempts for image:</label>
              <input
                type="number"
                value={this.state.downloadAttempts}
                onChange={event =>
                  this.setState({downloadAttempts: event.target.value})
                }
              />
            </div>
          )}

          {!this.state.isHttp && (
            <div>
              <div className="upgrade-modal-row">
                <label>Download timeout (torrent):</label>
                <input
                  type="number"
                  value={this.state.downloadTimeout}
                  onChange={event =>
                    this.setState({downloadTimeout: event.target.value})
                  }
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max download speed (Bps) (-1 for unlimited):</label>
                <input
                  type="number"
                  value={this.state.downloadLimit}
                  onChange={event =>
                    this.setState({downloadLimit: event.target.value})
                  }
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max upload speed (Bps) (-1 for unlimited):</label>
                <input
                  type="number"
                  value={this.state.uploadLimit}
                  onChange={event =>
                    this.setState({uploadLimit: event.target.value})
                  }
                />
              </div>

              <div className="upgrade-modal-row">
                <label>Max peer connections (-1 for unlimited):</label>
                <input
                  type="number"
                  value={this.state.maxConnections}
                  onChange={event =>
                    this.setState({maxConnections: event.target.value})
                  }
                />
              </div>
            </div>
          )}
        </div>
        <div className="upgrade-modal-footer">
          <button
            className="upgrade-modal-btn"
            onClick={this.modalClose.bind(this)}>
            Close
          </button>
          <button
            className="upgrade-modal-btn"
            onClick={this.submitPrepare.bind(this)}
            style={{backgroundColor: '#8b9dc3'}}>
            Submit
          </button>
        </div>
      </Modal>
    );
  }
}

ModalPrepareUpgrade.propTypes = {
  getExcludedNodes: PropTypes.func.isRequired,

  upgradeNodes: PropTypes.array.isRequired,
  upgradeImages: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  topologyName: PropTypes.string.isRequred,
};
