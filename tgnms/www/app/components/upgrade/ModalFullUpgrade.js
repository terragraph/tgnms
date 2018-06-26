import React from 'react';
import PropTypes from 'prop-types';
import {render} from 'react-dom';
import Modal from 'react-modal';
import Select from 'react-select';
import {versionSlicer} from '../../helpers/NetworkHelpers.js';

import swal from 'sweetalert';
import 'sweetalert/dist/sweetalert.css';

const classNames = require('classnames');

import {fullUpgrade} from '../../apiutils/UpgradeAPIUtil.js';

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

export default class ModalFullUpgrade extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeout: 180, // timeout for the entire prepare operation
      skipFailure: true, // skip failed nodes (will not stop operation)
      isParallel: true, // parallelize teh operation? (put all nodes in one batch)
      limit: 1, // limit per batch. max batch size is infinite if this is set to 0
      selectedImage: {}, // image to upgrade, with a name and a link
      scheduleToCommit: 0, // delay between issuing the command and each node starting the commit

      // TORRENT
      downloadTimeout: 180, // timeout for torrent download
      downloadLimit: -1, // limit for torrent download speed (-1 for unlimited)
      uploadLimit: -1, // limit for torrent upload speed (-1 for unlimited)
      maxConnections: -1, // max concurrent connections for torrent (-1 for unlimited)
    };
  }

  submitFullUpgrade() {
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
    const nodes = this.props.upgradeNodes;

    if (!this.state.isParallel) {
      const n = parseInt(this.state.limit, 10);
      if (isNaN(n) || String(n) !== this.state.limit || n < 1) {
        swal({
          title: 'Invalid input!',
          text: `Batch size limit is invalid. Use integers greater than 0.`,
          type: 'error',
        });
        return;
      }
    }

    const requestBody = {
      excludeNodes,
      nodes,
      timeout: this.state.timeout,
      md5: this.state.selectedImage.md5,
      imageUrl: this.state.selectedImage.magnetUri,
      skipFailure: this.state.skipFailure,
      // limit of 0 means unlimited max batch size
      limit: this.state.isParallel ? 0 : this.state.limit,
      scheduleToCommit: this.state.scheduleToCommit,
      skipLinks: [],
      requestId: 'NMS' + new Date().getTime(),
      topologyName: this.props.topologyName,
    };

    requestBody.torrentParams = {
      downloadTimeout: this.state.downloadTimeout,
      downloadLimit: this.state.downloadLimit,
      uploadLimit: this.state.uploadLimit,
      maxConnections: this.state.maxConnections,
    };

    fullUpgrade(requestBody);
    this.props.onClose();
  }

  modalClose() {
    this.setState({
      selectedImage: {},
    });
    this.props.onClose();
  }

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

  renderUpgradeImages = () => {
    const {upgradeImages} = this.props;
    const {selectedImage} = this.state;

    const selectOptions = upgradeImages.map(image => {
      const imageDisplayName = versionSlicer(image.name);
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
  };

  render() {
    const {upgradeNodes, upgradeState, isOpen} = this.props;
    /*
    Full Upgrade modal:
      List nodes
      Timeout
      Skip failure?
      Batch size limit
      Commit delay
      URL of image (selected by image name)

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
        onRequestClose={this.modalClose.bind(this)}
      >
        <div className="upgrade-modal-content">
          <label>
            Nodes to prepare and commit ({this.props.upgradeNodes.length})
          </label>
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
            </div>)}
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
          <div className="upgrade-modal-row">
            <label>Commit delay(s):</label>
            <input
              type="number"
              value={this.state.scheduleToCommit}
              onChange={event =>
                this.setState({scheduleToCommit: event.target.value})
              }
            />
          </div>
          </div>
        </div>
        <div className="upgrade-modal-footer">
          <button
            className="upgrade-modal-btn"
            onClick={this.modalClose.bind(this)}
          >
            Close
          </button>
          <button
            className="upgrade-modal-btn"
            onClick={this.submitFullUpgrade.bind(this)}
            style={{backgroundColor: '#8b9dc3'}}
          >
            Submit
          </button>
        </div>
      </Modal>
    );
  }
}

ModalFullUpgrade.propTypes = {
  getExcludedNodes: PropTypes.func.isRequired,
  upgradeNodes: PropTypes.array.isRequired,
  upgradeImages: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  topologyName: PropTypes.string.isRequred,
};
