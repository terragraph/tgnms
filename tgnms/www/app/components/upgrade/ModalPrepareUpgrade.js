/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import 'sweetalert/dist/sweetalert.css';

import ShowMorePanel from '../common/ShowMorePanel.js';
import {prepareUpgrade} from '../../apiutils/UpgradeAPIUtil.js';
import {MODAL_STYLE} from '../../constants/UpgradeConstants.js';
import classNames from 'classnames';
import {isEmpty} from 'lodash-es';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Modal from 'react-modal';
import Select from 'react-select';
import React from 'react';
import swal from 'sweetalert';

export default class ModalPrepareUpgrade extends React.Component {
  static propTypes = {
    getExcludedNodes: PropTypes.func.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    topologyName: PropTypes.string.isRequired,
    upgradeNodes: PropTypes.array.isRequired,
    upgradeImages: PropTypes.array.isRequired,
  };

  state = {
    timeout: 180, // timeout for the entire prepare operation
    skipFailure: true, // skip failed nodes (will not stop operation)
    isParallel: true, // parallelize the operation? (put all nodes in one batch)
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

  submitPrepare = () => {
    if (isEmpty(this.state.selectedImage)) {
      swal({
        title: 'No Image Selected',
        text: `No image was selected for upgrade.
        Please select one from the list or upload one through the "Manage Upgrade Images" option.
        `,
        type: 'error',
      });
      return;
    }

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
      nodes: this.props.upgradeNodes,
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
  };

  modalClose = () => {
    this.setState({
      selectedImage: {},
    });
    this.props.onClose();
  };

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

  renderUpgradeImagesSelect() {
    const {upgradeImages} = this.props;
    const {selectedImage} = this.state;

    const selectOptions = upgradeImages.map(image => ({
      label: image.name,
      value: image.name,
    }));

    return (
      <div className="upgrade-modal-row">
        <strong className="subtitle">Select an upgrade image</strong>
        <Select
          clearable={false}
          name="Select Image"
          options={selectOptions}
          onChange={this.selectUpgradeImage}
          placeholder="Select an Image"
          value={selectedImage.name}
        />
      </div>
    );
  }

  render() {
    const {isOpen, upgradeNodes, upgradeState} = this.props;
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

    return (
      <Modal
        style={MODAL_STYLE}
        isOpen={isOpen}
        onRequestClose={this.modalClose}>
        <div className="upgrade-modal-content">
          {this.renderUpgradeImagesSelect()}
          <div className="upgrade-modal-row">
            <strong className="subtitle">
              Nodes to prepare for upgrade ({upgradeNodes.length})
            </strong>
            <Select
              className="upgrade-modal-node-list"
              clearable={false}
              disabled
              multi
              options={upgradeNodes.map(node => ({value: node, label: node}))}
              placeholder=""
              value={upgradeNodes.join(',')}
            />
          </div>
          <div className="upgrade-modal-row">
            <label>Upgrade Timeout (s):</label>
            <input
              type="number"
              value={this.state.timeout}
              onChange={event => this.setState({timeout: event.target.value})}
            />
          </div>

          <ShowMorePanel
            buttonClass="upgrade-more-options-button"
            moreButtonName="Show Additional Options">
            <div className="upgrade-modal-row">
              <label>Skip Failures?</label>
              <input
                type="checkbox"
                checked={this.state.skipFailure}
                onChange={event =>
                  this.setState({skipFailure: event.target.checked})
                }
              />
            </div>

            <div className="upgrade-modal-row">
              <label>Fully Parallelize Upgrade?</label>
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
                <label>Batch Size Limit (nodes):</label>
                <input
                  type="number"
                  value={this.state.limit}
                  onChange={event => this.setState({limit: event.target.value})}
                />
              </div>
            )}
            {/* Http or Torrent option removed until implemented */}
            {/* <div className="upgrade-modal-row">
              <label>Download Method:</label>
              <div className="type-selector">
                <label className="choice" htmlFor="http">
                  <input
                    type="radio"
                    id="http"
                    value="http"
                    onChange={this.onChangeDownloadMode}
                    checked={this.state.isHttp}
                    disabled
                  />
                  <div className="choice-label">HTTP</div>
                </label>
                <label className="choice" htmlFor="torrent">
                  <input
                    type="radio"
                    name="torrent"
                    value="torrent"
                    onChange={this.onChangeDownloadMode}
                    checked={!this.state.isHttp}
                  />
                  <div className="choice-label">Torrent</div>
                </label>
              </div>
            </div> */}

            {this.state.isHttp && (
              <div className="upgrade-modal-row">
                <label>Download Attempts for Image:</label>
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
                  <label>Download Timeout (torrent):</label>
                  <input
                    type="number"
                    value={this.state.downloadTimeout}
                    onChange={event =>
                      this.setState({downloadTimeout: event.target.value})
                    }
                  />
                </div>

                <div className="upgrade-modal-row">
                  <label>Max Download Speed (Bps) (-1 for Unlimited):</label>
                  <input
                    type="number"
                    value={this.state.downloadLimit}
                    onChange={event =>
                      this.setState({downloadLimit: event.target.value})
                    }
                  />
                </div>

                <div className="upgrade-modal-row">
                  <label>Max Upload Speed (Bps) (-1 for Unlimited):</label>
                  <input
                    type="number"
                    value={this.state.uploadLimit}
                    onChange={event =>
                      this.setState({uploadLimit: event.target.value})
                    }
                  />
                </div>

                <div className="upgrade-modal-row">
                  <label>Max Peer Connections (-1 for Unlimited):</label>
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
          </ShowMorePanel>
        </div>
        <div className="upgrade-modal-footer">
          <button onClick={this.submitPrepare}>Submit</button>
          <button onClick={this.modalClose}>Close</button>
        </div>
      </Modal>
    );
  }
}
